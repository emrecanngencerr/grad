from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _ # For translatable strings
from django.conf import settings # To reference AUTH_USER_MODEL
from django.core.exceptions import ValidationError # For custom validation
from django.utils import timezone
from datetime import timedelta
import uuid


def user_profile_picture_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/profile_pics/user_<id>/<filename>
    return f'profile_pics/user_{instance.id}/{filename}'

class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.id: # Only set expiry on creation
            # Token valid for a shorter period, e.g., 1 hour
            self.expires_at = timezone.now() + timedelta(hours=1) 
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Password Reset Token for {self.user.email}"

# --- Turkish ID Validator ---
def validate_turkish_identity_number(value):
    """
    Basic validation for Turkish Identity Number (T.C. Kimlik Numarası).
    This is a basic algorithmic check, not a check against a central registry.
    For real validation against MERNIS, you'd need official integration.
    """
    if not value.isdigit() or len(value) != 11:
        raise ValidationError(_('Identity number must be 11 digits.'))
    if value.startswith('0'):
        raise ValidationError(_('Identity number cannot start with zero.'))

    digits = [int(d) for d in value]
    
    # Check 10th digit
    sum_odd = sum(digits[i] for i in range(0, 9, 2))
    sum_even = sum(digits[i] for i in range(1, 8, 2))
    check_digit_10 = ((sum_odd * 7) - sum_even) % 10
    if check_digit_10 < 0: # Ensure positive modulo result
        check_digit_10 += 10
        
    if digits[9] != check_digit_10:
        raise ValidationError(_('Invalid Turkish Identity Number (10th digit check failed).'))

    # Check 11th digit
    sum_first_10 = sum(digits[i] for i in range(0, 10))
    check_digit_11 = sum_first_10 % 10
    
    if digits[10] != check_digit_11:
        raise ValidationError(_('Invalid Turkish Identity Number (11th digit check failed).'))

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password, first_name, last_name, identity_number, birth_date, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        if not first_name:
            raise ValueError(_('First name must be set'))
        if not last_name:
            raise ValueError(_('Last name must be set'))
        if not identity_number:
            raise ValueError(_('Identity number must be set'))
        if not birth_date:
            raise ValueError(_('Birth date must be set'))

        email = self.normalize_email(email)
        # Validate ID number before creating user (also done at serializer level)
        validate_turkish_identity_number(identity_number) 

        user = self.model(
            email=email, 
            first_name=first_name,
            last_name=last_name,
            identity_number=identity_number,
            birth_date=birth_date,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, first_name, last_name, identity_number, birth_date, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        # For superuser, email_verified might be true by default
        extra_fields.setdefault('email_verified', True) 

        # ... (ValueError checks for is_staff, is_superuser)
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, first_name, last_name, identity_number, birth_date, **extra_fields)

class CustomUser(AbstractUser):
    username = None # Using email for login
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=False) # Now required
    last_name = models.CharField(_('last name'), max_length=150, blank=False)  # Now required
    
    identity_number = models.CharField(
        _('identity number'), 
        max_length=11, 
        unique=True, # TC Kimlik No should be unique
        validators=[validate_turkish_identity_number],
        blank=False # Now required
    )
    birth_date = models.DateField(_('birth date'), blank=False, null=False) # Now required
    
    email_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(
        _('profile picture'), 
        upload_to='profile_pics/user_%Y/%m/%d/', # Changed path slightly
        null=True, 
        blank=True
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'identity_number', 'birth_date'] # For createsuperuser

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def clean(self): # Additional model-level validation
        super().clean()
        if self.birth_date and self.birth_date > timezone.now().date():
            raise ValidationError({'birth_date': _('Birth date cannot be in the future.')})
        # You could add age restrictions here too if needed (e.g., must be 18+)