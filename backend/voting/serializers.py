# backend/voting/serializers.py
from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import json 
from cryptography.hazmat.primitives import serialization 
from e_voting.crypto_utils import crypto_utils 
import base64

from .models import Election, Candidate, Vote, VoteCommitment 


User = get_user_model() # Use your CustomUser model

# --- Password Reset Serializers ---
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True) # Or UUIDField if your token is a UUID
    new_password1 = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({"new_password2": "The two new password fields didn't match."})
        
        # Apply Django's built-in password validators to the new password
        # The user context is not easily available here without fetching user by token first.
        # The view should handle fetching user by token and can pass user to validate_password.
        try:
            validate_password(data['new_password1']) # Validate without user context
        except DjangoValidationError as e:
            raise serializers.ValidationError({'new_password1': list(e.messages)})
        return data

# --- User Registration and Profile Serializers ---
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password], # Django's built-in password validators
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True, 
        label="Confirm password",
        style={'input_type': 'password'}
    )

    class Meta:
        model = User 
        fields = ('id', 'email', 'password', 'password2', 
          'first_name', 'last_name', 'identity_number', 'birth_date')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True}, 
            'last_name': {'required': True}, 
            'identity_number': {'required': True},
            'birth_date': {'required': True}
}

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        # Password strength is already handled by 'validators=[validate_password]' on the field.
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            identity_number=validated_data['identity_number'],
            birth_date=validated_data['birth_date']
        )
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password1 = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your old password was entered incorrectly. Please enter it again.")
        return value

    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({"new_password2": "The two new password fields didn't match."})
        try:
            validate_password(data['new_password1'], self.context['request'].user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'new_password1': list(e.messages)})
        return data

    def save(self, **kwargs): # Renamed from update to align with Serializer's save method
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password1'])
        user.save()
        # Update session auth hash to prevent logout after password change, if using session auth
        # from django.contrib.auth import update_session_auth_hash
        # update_session_auth_hash(self.context['request'], user) 
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField(read_only=True)
    # 'profile_picture' is for upload. If it's null on PUT/PATCH, it means remove.
    # If it's a file, it means update. If it's not sent, it means keep current.
    profile_picture = serializers.ImageField(required=False, allow_null=True, use_url=False) 

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'identity_number', 'birth_date', 
            'is_staff', 'is_active', 'email_verified',
            'profile_picture', 'profile_picture_url'
        ]
        read_only_fields = [
            'email', 'is_staff', 'is_active', 
            'email_verified', 'profile_picture_url'
        ]

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        return None

    def update(self, instance, validated_data):
        # If profile_picture is None in validated_data, it means client wants to remove it.
        if 'profile_picture' in validated_data and validated_data['profile_picture'] is None:
            if instance.profile_picture: # Check if there's an existing picture to delete
                instance.profile_picture.delete(save=False) # Delete old file
            instance.profile_picture = None # Set field to None
        elif 'profile_picture' in validated_data: # A new file was uploaded
             if instance.profile_picture: # If an old picture exists, delete it first
                instance.profile_picture.delete(save=False)
        # Let super().update handle the rest, including new profile_picture file if present
        return super().update(instance, validated_data)


# --- Candidate Serializers ---
class CandidateSerializer(serializers.ModelSerializer): # For Admin CRUD on Candidates
    photo_url = serializers.SerializerMethodField(read_only=True)
    election = serializers.PrimaryKeyRelatedField(queryset=Election.objects.all())
    photo = serializers.ImageField(required=False, allow_null=True, use_url=False) # For upload

    class Meta:
        model = Candidate
        fields = ['id', 'name', 'description', 'election', 'photo', 'photo_url']
        # To prevent sending back the raw 'photo' field path and only use 'photo_url':
        # extra_kwargs = {'photo': {'write_only': True}} # Uncomment if you prefer this

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and hasattr(obj.photo, 'url'):
            return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None

class AdminCandidateNestedSerializer(serializers.ModelSerializer): # For nesting in Election lists
    photo_url = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Candidate
        fields = ['id', 'name', 'description', 'photo_url'] # Read-only fields for display

    def get_photo_url(self, obj): # Duplicated logic, could be inherited or moved to a mixin
        request = self.context.get('request')
        if obj.photo and hasattr(obj.photo, 'url'):
            return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None


# --- Election Serializers ---
class ElectionSerializer(serializers.ModelSerializer): # For Voters (Read-only perspective)
    candidates = AdminCandidateNestedSerializer(many=True, read_only=True)
    is_open_for_voting = serializers.ReadOnlyField()

    class Meta:
        model = Election
        fields = ['id', 'name', 'description', 'start_time', 'end_time', 'is_active', 'candidates', 'is_open_for_voting']

class AdminElectionSerializer(serializers.ModelSerializer): # For Admins
    # For READ operations, this will show nested candidates
    candidates = AdminCandidateNestedSerializer(many=True, read_only=True, required=False)
    is_open_for_voting = serializers.ReadOnlyField()

    class Meta:
        model = Election
        fields = [
            'id', 'name', 'description', 'start_time', 'end_time',
            'is_active', 'is_open_for_voting',
            'candidates', # This is read-only based on AdminCandidateNestedSerializer
        ]
    def create(self, validated_data):
        import json
        request = self.context.get('request')
        

        candidates_json_str = request.data.get('candidates_json', '[]') 
        try:
            candidates_list_data = json.loads(candidates_json_str)
            if not isinstance(candidates_list_data, list):
                candidates_list_data = [] 
        except json.JSONDecodeError as e:
            print(f"Error parsing candidates_data JSON string: {e}")
            raise serializers.ValidationError({"candidates_json": "Invalid JSON format for candidates."})


        from django.db import transaction
        try:
            with transaction.atomic(): # Start a database transaction
                election = Election.objects.create(**validated_data) 

                for index, cand_data in enumerate(candidates_list_data):
                    photo_file = request.FILES.get(f'candidate_photo_{index}')
                    Candidate.objects.create(
                        election=election,
                        name=cand_data.get('name'),
                        description=cand_data.get('description', ''),
                        photo=photo_file
                    )
            return election
        except Exception as e: # Catch any exception during the transaction
            print(f"Error during election/candidate creation transaction: {e}")
            raise serializers.ValidationError("Failed to create election and candidates due to a server error.")
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.start_time = validated_data.get('start_time', instance.start_time)
        instance.end_time = validated_data.get('end_time', instance.end_time)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        

        instance.save()
        return instance

# --- Vote Serializer ---
class VoteSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    election = serializers.StringRelatedField(read_only=True)

    election_id = serializers.PrimaryKeyRelatedField(
        queryset=Election.objects.all(), 
        source='election', # This ensures data['election'] is an Election instance in validate/create
        write_only=True   
    )
    candidate_id = serializers.IntegerField(write_only=True)

    nonce = serializers.CharField(write_only=True, required=True, max_length=64) # This is for input ONLY

    class Meta:
        model = Vote
        fields = [
            'id',                   # Read-only
            'user',                 # Read-only (from model instance)
            'election',             # Read-only (from model instance, shows __str__ of Election)
            'voted_at',             # Read-only
            'encrypted_vote_data',  # Read-only (populated by create method)
            'election_id',          
            'candidate_id',
            'nonce'            
        ]
        read_only_fields = ['id', 'user', 'election', 'voted_at', 'encrypted_vote_data']

    def validate(self, data):
        user_casting_vote = self.context['request'].user
        election_being_voted_in = data['election'] 
        candidate_id_selected = data['candidate_id']

        nonce_from_request = data['nonce'] # 'nonce' is now correctly in 'data'
        if not nonce_from_request:
            raise serializers.ValidationError({"nonce": "Nonce is required to reveal your commitment."})

        if not election_being_voted_in.is_open_for_voting:
            raise serializers.ValidationError("This election is not currently open for voting.")

        try:
            Candidate.objects.get(pk=candidate_id_selected, election=election_being_voted_in)
        except Candidate.DoesNotExist:
            raise serializers.ValidationError("Invalid candidate for this election.")

        if not election_being_voted_in.is_open_for_voting:
            raise serializers.ValidationError("This election is not currently open for voting.")
        
        try:
            Candidate.objects.get(pk=candidate_id_selected, election=election_being_voted_in)
        except Candidate.DoesNotExist:
            raise serializers.ValidationError("Invalid candidate for this election.")

        if Vote.objects.filter(user=user_casting_vote, election=election_being_voted_in).exists():
            raise serializers.ValidationError(
                {"detail": "You have already voted in this election."}, code='already_voted'
            )
        
        try:
            commitment_obj = VoteCommitment.objects.get(user=user_casting_vote, election=election_being_voted_in)
            if commitment_obj.is_revealed:
                raise serializers.ValidationError("Your commitment for this election has already been revealed (voted).")

            vote_data_to_verify = {'candidate_id': candidate_id_selected, 'election_id': election_being_voted_in.id}
            is_valid_commitment = crypto_utils.verify_vote_commitment(
                commitment_obj.commitment_hash,
                vote_data_to_verify,
                nonce_from_request
            )
            if not is_valid_commitment:
                raise serializers.ValidationError("Vote data or nonce does not match your commitment.")
            data['commitment_obj'] = commitment_obj # Pass for create method
        except VoteCommitment.DoesNotExist:
            raise serializers.ValidationError("No prior vote commitment found for this election. Please commit first.")
        
        if not election_being_voted_in.rsa_public_key_pem:
            raise serializers.ValidationError("Election is not configured for encrypted voting (missing public key).")
            
        return data

    def create(self, validated_data):
        # 'nonce' is an explicit serializer field but not a model field.
        # It will be present in validated_data if it passed validation.
        # We don't need to pop it if we are explicitly creating the Vote object
        # with only its model fields.
        
        commitment_obj = validated_data.pop('commitment_obj') 

        user = self.context['request'].user
        election = validated_data['election'] 
        candidate_id = validated_data['candidate_id']

        vote_to_encrypt = {'candidate_id': candidate_id, 'election_id': election.id}
        
        public_key_obj = serialization.load_pem_public_key(
            election.rsa_public_key_pem.encode('utf-8'),
            backend=crypto_utils.backend
        )
        encrypted_payload = crypto_utils.encrypt_vote(vote_to_encrypt, public_key_obj)
        
        vote = Vote.objects.create(
            user=user,
            election=election,
            encrypted_vote_data=json.dumps(encrypted_payload)
        )
        
        commitment_obj.is_revealed = True
        commitment_obj.save()
        
        return vote


# --- ElectionResultSerializer ---
class ElectionResultSerializer(serializers.ModelSerializer):
     # 'results' will now come from the pre-tallied JSON stored on the Election model
    results = serializers.SerializerMethodField() 
    signature = serializers.CharField(source='results_signature', read_only=True, allow_null=True)
    system_ed25519_public_key_b64 = serializers.SerializerMethodField() # To provide public key for verification

    class Meta:
        model = Election
        fields = [
            'id', 
            'name', 
            'results',      # The processed results with percentages
            'signature',    # The Ed25519 signature of the raw tallied results
            'system_ed25519_public_key_b64' # The system's public key to verify the signature
        ]

    def get_results(self, obj_election): # obj_election is the Election instance
        request = self.context.get('request')
        
        # --- Permission to view results ---
        can_view_results = False
        if request and request.user.is_staff:
            can_view_results = True
        elif not obj_election.is_open_for_voting: # If election is closed (past end_time or not active)
            can_view_results = True
        
        if not can_view_results:
            return "Results are not available at this time."

        # --- Display Pre-Tallied Results (from tallied_results_json) ---
        if not obj_election.tallied_results_json: # Check if tallying has been performed and results stored
            # If votes exist but haven't been tallied, give a different message
            if Vote.objects.filter(election=obj_election).exists():
                 return f"{Vote.objects.filter(election=obj_election).count()} encrypted vote(s) recorded. Tallying process not yet run or completed."
            return "No votes have been cast, or results are not yet tallied for this election."
            
        try:
            # tallied_results_json stores the raw counts: {"Candidate A": 10, "Candidate B": 5}
            raw_tallied_results = json.loads(obj_election.tallied_results_json)
            
            if not raw_tallied_results: # If the JSON was empty (e.g., "{}")
                return "No votes were tallied for any candidate."

            total_votes_tallied = sum(raw_tallied_results.values())
            
            # Format results with percentages for display
            results_with_percentage = {
                candidate_name: {
                    "votes": count, 
                    "percentage": f"{(count / total_votes_tallied * 100):.1f}%" if total_votes_tallied > 0 else "0.0%"
                }
                for candidate_name, count in raw_tallied_results.items()
            }
            return results_with_percentage
        except json.JSONDecodeError:
            return "Error: Tallied results data is corrupted or in an invalid format."
        except Exception as e:
            print(f"Error processing tallied results for election {obj_election.id}: {e}")
            return "An error occurred while preparing results for display."

    def get_system_ed25519_public_key_b64(self, obj):
        # Provide the system's public key (Base64 encoded) for frontend verification display
        try:
            public_key = crypto_utils.get_system_ed25519_public_key() # Assumes this method exists in crypto_utils
            public_key_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw
            )
            return base64.b64encode(public_key_bytes).decode()
        except Exception as e:
            print(f"Error getting system Ed25519 public key: {e}")
            return None
class VoteCommitmentRequestSerializer(serializers.Serializer):
    election_id = serializers.IntegerField(write_only=True)
    candidate_id = serializers.IntegerField(write_only=True) 
    nonce = serializers.CharField(write_only=True, max_length=64) # Assuming nonce is a string (e.g., hex or base64)


    def validate_election_id(self, value):
        try:
            election = Election.objects.get(pk=value)
            if not election.is_open_for_voting:
                raise serializers.ValidationError("This election is not currently open for voting to make a commitment.")
            return election
        except Election.DoesNotExist:
            raise serializers.ValidationError("Election not found.")

    def validate_candidate_id(self, value):
        election = self.initial_data.get('election_id') # Get the raw election_id first
        if election:
            try:
                election_obj = Election.objects.get(pk=int(election))
                candidate = Candidate.objects.get(pk=value, election=election_obj)
                return candidate.id # Return the candidate id
            except (Election.DoesNotExist, Candidate.DoesNotExist):
                raise serializers.ValidationError("Invalid candidate for the specified election.")
            except ValueError:
                 raise serializers.ValidationError("Invalid election_id format for candidate check.")
        return value

    def validate(self, data):
        user = self.context['request'].user
        election = data['election_id'] # This is now an Election instance from validate_election_id
        
        # Check if commitment already exists
        if VoteCommitment.objects.filter(user=user, election=election).exists():
            raise serializers.ValidationError("You have already made a vote commitment for this election.")
        
        # Check if already voted (should ideally not happen if commitment is first step)
        if Vote.objects.filter(user=user, election=election).exists():
            raise serializers.ValidationError("You have already voted in this election; cannot make a new commitment.")
            
        return data