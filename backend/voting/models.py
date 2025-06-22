# backend/voting/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid

# --- DEFINE Election FIRST if other models in this file reference it by class name ---
class Election(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=False)
    rsa_public_key_pem = models.TextField(blank=True, null=True)
    
    # --- ADD/VERIFY THESE FIELDS ---
    tallied_results_json = models.TextField(
        blank=True, 
        null=True, 
        help_text="Stores the raw JSON of tallied candidate counts after decryption."
    )
    results_signature = models.TextField(
        blank=True, 
        null=True,
        help_text="Base64 Ed25519 signature of the tallied_results_json."
    )
    # --- END OF FIELDS TO ADD/VERIFY ---

    def __str__(self):
        return self.name

    @property
    def is_open_for_voting(self):
        now = timezone.now()
        if self.start_time and self.end_time:
            return self.is_active and self.start_time <= now <= self.end_time
        return False

# Helper function for upload_to
def candidate_photo_path(instance, filename):
    return f'candidate_photos/election_{instance.election.id}/{filename}'

class Candidate(models.Model):
    election = models.ForeignKey(Election, related_name='candidates', on_delete=models.CASCADE) # This is fine since Election is defined above
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    photo = models.ImageField(
        upload_to=candidate_photo_path, 
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.election.name})"

class Vote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    election = models.ForeignKey(Election, on_delete=models.CASCADE) # Fine as Election is above
    encrypted_vote_data = models.TextField() # Stores the JSON string from 

    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'election')

    def __str__(self):
        return f"Encrypted vote by {self.user.email} in election '{self.election.name}' at {self.voted_at.strftime('%Y-%m-%d %H:%M')}"

class EmailVerificationToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, 
        related_name='email_verification_token'
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.id:
            self.expires_at = timezone.now() + timedelta(hours=24) 
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Token for {self.user.email}"

class VoteCommitment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    election = models.ForeignKey(Election, on_delete=models.CASCADE)
    commitment_hash = models.CharField(max_length=128, db_index=True) # To store the Base64 encoded hash
    # The actual nonce is NOT stored on the server until the reveal phase for this scheme.
    # The server only knows the hash(vote + nonce).
    # If you wanted the server to store the nonce separately for some reason, that's a different design.
    created_at = models.DateTimeField(auto_now_add=True)
    is_revealed = models.BooleanField(default=False) # Mark true after successful vote reveal

    class Meta:
        unique_together = ('user', 'election') # User can only have one commitment per election

    def __str__(self):
        return f"Commitment by {self.user.email} for election '{self.election.name}'"