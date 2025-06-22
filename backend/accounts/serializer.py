# backend/accounts/serializers.py (or voting/serializers.py)
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

User = get_user_model()

class CustomTokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    # default_error_messages defined in parent class are generic.
    # We will override validate to provide more specific messages.

    def validate(self, attrs):
        # 'email' and 'password' will be in attrs because USERNAME_FIELD is 'email'
        # and password field is standard.
        email = attrs.get(User.USERNAME_FIELD) # Use User.USERNAME_FIELD to be robust
        password = attrs.get('password')

        user = None
        if email and password:
            # Try to fetch the user by email first
            try:
                # Important: Case-insensitive lookup for email if your DB/model supports it.
                # For exact match, Django's default manager does this well with unique=True.
                # For custom behavior, you might need an explicit .iexact filter.
                user_obj = User.objects.get(email__iexact=email) # Case-insensitive email lookup

                # Now check if this user object can be authenticated with the given password
                # The authenticate() function will also check user.is_active by default.
                # We want to separate these checks.
                
                if not user_obj.is_active:
                    # If you have an email_verified field and want to prioritize that message:
                    if hasattr(user_obj, 'email_verified') and not user_obj.email_verified:
                        raise AuthenticationFailed(
                            _('Account not verified. Please check your email.'),
                            'account_not_verified'
                        )
                    else: # General inactive account
                        raise AuthenticationFailed(
                            _('Account is inactive. Please contact support or verify your email.'),
                            'account_inactive'
                        )
                
                # If active, now check password
                if not user_obj.check_password(password):
                    raise AuthenticationFailed(
                        self.error_messages['no_active_account'], # "No active account found with the given credentials."
                                                                   # This is okay if user is active but password is wrong
                        'invalid_credentials' 
                        # Or a more specific message:
                        # _('Incorrect password. Please try again.'),
                        # 'incorrect_password'
                    )
                # If we reach here, user is active and password is correct
                user = user_obj

            except User.DoesNotExist:
                # User with this email does not exist.
                # To prevent email enumeration, we still return a generic message.
                # simple-jwt's default "No active account..." is fine.
                raise AuthenticationFailed(
                    self.error_messages['no_active_account'],
                    'invalid_credentials'
                )
            except AuthenticationFailed: # Re-raise specific AuthenticationFailed exceptions
                raise
            except Exception as e: # Catch any other unexpected errors
                print(f"Unexpected error during authentication for {email}: {e}")
                raise AuthenticationFailed(
                    _('An unexpected error occurred during authentication.'),
                    'authentication_error'
                )
        else:
            msg = _('Must include "{username_field}" and "password".')
            msg = msg.format(username_field=User.USERNAME_FIELD)
            raise serializers.ValidationError(msg, code='authorization')


        if user is None: # Should have been caught by exceptions above
             raise AuthenticationFailed(
                self.error_messages['no_active_account'],
                'invalid_credentials'
            )

        # The rest is from the parent class to generate the token
        data = super().validate(attrs) # This will call get_token
        return data

    # get_token method can remain as is or add custom claims
    # @classmethod
    # def get_token(cls, user):
    #     token = super().get_token(user)
    #     # Add custom claims
    #     # token['email'] = user.email
    #     return token