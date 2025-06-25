from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Election, Candidate, Vote
from rest_framework.views import APIView
from rest_framework import serializers as drf_serializers # <<< IMPORT serializers module
from .models import EmailVerificationToken # <<< IMPORT
from django.utils import timezone # Import timezone
from e_voting.crypto_utils import crypto_utils
from cryptography.hazmat.primitives import serialization # For serializing keys
from .serializers import (
    UserProfileSerializer, UserSerializer, ElectionSerializer, CandidateSerializer, VoteCommitmentRequestSerializer,
    VoteSerializer, ElectionResultSerializer, ChangePasswordSerializer,
    PasswordResetConfirmSerializer, PasswordResetRequestSerializer, AdminElectionSerializer
)
from rest_framework import generics, viewsets, status, parsers
from accounts.models import PasswordResetToken
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
 
from django.contrib.auth import get_user_model
from .models import VoteCommitment # Ensure VoteCommitment is imported
import json
 
User = get_user_model() # Call the function to get the correct User model
 
class SubmitVoteCommitmentView(generics.CreateAPIView): # Or just APIView
    serializer_class = VoteCommitmentRequestSerializer
    permission_classes = [IsAuthenticated]
 
    def perform_create(self, serializer): # Called by CreateAPIView if serializer.is_valid()
        user = self.request.user
        election = serializer.validated_data['election_id'] # This is the Election instance
        candidate_id = serializer.validated_data['candidate_id']
        nonce = serializer.validated_data['nonce']
 
        vote_data_to_commit = {'candidate_id': candidate_id, 'election_id': election.id}
        
        commitment_hash = crypto_utils.generate_vote_commitment(vote_data_to_commit, nonce)
 
        VoteCommitment.objects.create(
            user=user,
            election=election,
            commitment_hash=commitment_hash
        )
 
class SubmitVoteCommitmentView(APIView):
    permission_classes = [IsAuthenticated]
 
    def post(self, request, *args, **kwargs):
        serializer = VoteCommitmentRequestSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            election = serializer.validated_data['election_id'] # Election instance
            candidate_id = serializer.validated_data['candidate_id'] # Candidate ID
            nonce = serializer.validated_data['nonce']
 
            vote_data_to_commit = {'candidate_id': candidate_id, 'election_id': election.id}
            commitment_hash = crypto_utils.generate_vote_commitment(vote_data_to_commit, nonce)
 
            VoteCommitment.objects.create(
                user=user,
                election=election,
                commitment_hash=commitment_hash
            )
            return Response({"message": "Vote commitment received successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
class PasswordResetRequestView(generics.GenericAPIView): # Use GenericAPIView for serializer_class
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
 
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email, is_active=True)
                
                # Invalidate old tokens for this user
                PasswordResetToken.objects.filter(user=user).delete()
                
                # Create new token
                token_instance = PasswordResetToken.objects.create(user=user)
                reset_token = token_instance.token
 
                # Send email
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}" # No trailing slash after token
                subject = 'Password Reset Request - E-Voting System'
                context = {'user': user, 'reset_url': reset_url}
                html_message = render_to_string('email/password_reset_email.html', context)
                plain_message = strip_tags(html_message)
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'webmaster@localhost')
                
                try:
                    send_mail(subject, plain_message, from_email, [user.email], html_message=html_message)
                except Exception as e:
                    print(f"Error sending password reset email to {user.email}: {e}")
                    # Don't reveal email sending failure to the user for security reasons
                
                # Always return a generic success message to prevent email enumeration
                return Response(
                    {"detail": "If an account with this email exists, a password reset link has been sent."},
                    status=status.HTTP_200_OK
                )
 
            except User.DoesNotExist:
                # User not found or not active, still return a generic message
                return Response(
                    {"detail": "If an account with this email exists, a password reset link has been sent."},
                    status=status.HTTP_200_OK
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
 
class PasswordResetConfirmView(generics.GenericAPIView): # Use GenericAPIView for serializer_class
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
 
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            token_value = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password1']
 
            try:
                reset_token_obj = PasswordResetToken.objects.get(token=token_value)
 
                if reset_token_obj.is_expired():
                    reset_token_obj.delete() # Clean up expired token
                    return Response(
                        {"error": "Password reset link has expired. Please request a new one."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
 
                user_to_reset = reset_token_obj.user
                
                # Additional validation of new_password1 with user context if needed
                # try:
                #     django_validate_password(new_password, user=user_to_reset)
                # except DjangoValidationError as e:
                #     return Response({'new_password1': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
 
                user_to_reset.set_password(new_password) # Hashes the password
                user_to_reset.save()
                
                reset_token_obj.delete() # Token is single-use
 
                return Response(
                    {"detail": "Password has been reset successfully. You can now log in with your new password."},
                    status=status.HTTP_200_OK
                )
            except PasswordResetToken.DoesNotExist:
                return Response(
                    {"error": "Invalid or already used password reset link."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                print(f"Error during password reset confirm: {e}")
                return Response(
                    {'error': 'An unexpected error occurred.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
 
    def get(self, request, token_value): # token_value comes from the URL
        print(f"--- VerifyEmailView ---")
        print(f"Received token_value from URL: {token_value} (type: {type(token_value)})")
 
        # The <uuid:token_value> path converter should already give you a UUID object.
        # If it's still a string, you might need to convert it.
        # However, Django's UUID path converter is usually robust.
 
        try:
            # Query using the token_value directly, as it should be a UUID object
            verification_token_obj = EmailVerificationToken.objects.get(token=token_value)
            print(f"Found token object in DB: {verification_token_obj.token} for user {verification_token_obj.user.email}")
 
            user_to_verify = verification_token_obj.user
 
            # Check 1: Is token expired?
            if verification_token_obj.is_expired():
                print(f"Token {verification_token_obj.token} is EXPIRED.")
                # For expired tokens, delete them to prevent clutter.
                # verification_token_obj.delete() # Let's delete only after all checks or on success
                return Response(
                    {'error': 'Verification link has expired. Please register again to get a new link.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
 
            # Check 2: Is user already active and email verified?
            # (Assuming 'email_verified' exists on your CustomUser model)
            already_fully_verified = user_to_verify.is_active and (hasattr(user_to_verify, 'email_verified') and user_to_verify.email_verified)
            
            if already_fully_verified:
                print(f"User {user_to_verify.email} is ALREADY ACTIVE and VERIFIED.")
                # Token still exists but user is already verified/active. Safe to delete token.
                verification_token_obj.delete() # Delete the now redundant token
                print(f"Deleted token {verification_token_obj.token} for already verified user.")
                return Response(
                    {'message': 'Your email address has already been verified. You can log in.'},
                    status=status.HTTP_200_OK
                )
            
            # If not already fully verified, proceed with activation/verification
            print(f"Proceeding to verify user {user_to_verify.email}")
            if hasattr(user_to_verify, 'email_verified'):
                user_to_verify.email_verified = True
            user_to_verify.is_active = True # Crucial step to activate the user
            user_to_verify.save()
            print(f"User {user_to_verify.email} set to active and email_verified (if applicable).")
            
            # Token is single-use; delete AFTER successful activation
            token_to_delete = verification_token_obj.token # Store before deleting for log
            verification_token_obj.delete()
            print(f"Successfully verified and DELETED token {token_to_delete}.")
            
            return Response(
                {'message': 'Email successfully verified! You can now log in.'},
                status=status.HTTP_200_OK
            )
 
        except EmailVerificationToken.DoesNotExist:
            print(f"Token {token_value} NOT FOUND in DB.")
            return Response(
                {'error': 'Invalid verification link. It may have already been used or does not exist.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"UNEXPECTED ERROR during email verification (Token: {token_value}): {e}")
            import traceback
            traceback.print_exc() # Print full traceback for unexpected errors
            return Response(
                {'error': 'An unexpected error occurred during verification. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class ChangePasswordView(generics.UpdateAPIView): # Or just APIView and handle POST
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
 
    def update(self, request, *args, **kwargs): # Called by PUT or PATCH
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save() # This will call the serializer's save method
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
 
    # If using APIView and POST:
    # def post(self, request, *args, **kwargs):
    #     serializer = self.get_serializer(data=request.data, context={'request': request})
    #     if serializer.is_valid():
    #         serializer.save()
    #         return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)        
# --- THIS IS THE VIEWSET TO VERIFY OR CREATE ---
class AdminUserViewSet(viewsets.ReadOnlyModelViewSet): # ReadOnly is fine if you only need to list users
    queryset = User.objects.all().order_by('email') # Get all users, ordered
    serializer_class = UserSerializer # Use a serializer that outputs at least 'id' and 'username'
    permission_classes = [IsAdminUser] # IMPORTANT: Only admins can access
    # pagination_class = StandardResultsSetPagination # Optional: add pagination
# --- END OF VIEWSET VERIFICATION ---
 
class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all() # Or CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
 
    def perform_create(self, serializer):
        user = serializer.save()
        if hasattr(user, 'email_verified'): # If using CustomUser with email_verified
            user.email_verified = False
        user.is_active = False # Deactivate account until email is verified
        user.save()
        # Create and send verification email
        token_instance = EmailVerificationToken.objects.create(user=user)
        verification_token_uuid_obj = token_instance.token # This is the UUID object from the DB record
        verification_token_str = str(verification_token_uuid_obj)
        
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{verification_token_str}"
 
        verification_token_str = str(verification_token_uuid_obj)
        
        print(f"--- UserCreateView ---")
        print(f"User created: {user.email}, ID: {user.id}")
        print(f"Token instance created for user {user.id}. Token PK: {token_instance.pk}")
        print(f"Token VALUE from DB instance (UUID object): {verification_token_uuid_obj}")
        print(f"Token VALUE as string FOR EMAIL LINK: {verification_token_str}")
        # --- End focus section ---
        
        subject = 'Activate Your E-Voting System Account'
        context = {
            'user': user,
            'verify_url': verify_url,
        }
        html_message = render_to_string('email/verify_email_template.html', context)
        plain_message = strip_tags(html_message)
        from_email = settings.DEFAULT_FROM_EMAIL # Make sure this is set in settings.py
        to_email = user.email
 
        try:
            send_mail(subject, plain_message, from_email, [to_email], html_message=html_message)
            print(f"Verification email content prepared for {to_email} for user {user.pk} with token {verification_token_str}")
        except Exception as e:
            print(f"Error sending verification email to {to_email}: {e}")
 
class ElectionViewSet(viewsets.ReadOnlyModelViewSet): # Read-only for regular users
    queryset = Election.objects.all().prefetch_related('candidates')
    serializer_class = ElectionSerializer
    permission_classes = [IsAuthenticated] # Must be logged in to view elections
 
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def results(self, request, pk=None):
        election = self.get_object()
        # The serializer will handle permission logic for showing results
        serializer = ElectionResultSerializer(election, context={'request': request})
        return Response(serializer.data)
 
class AdminElectionViewSet(viewsets.ModelViewSet): # Full CRUD for admins
    queryset = Election.objects.all()
    serializer_class = AdminElectionSerializer  # Use the updated serializer
    permission_classes = [IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
 
    _temp_generated_private_key_pem = None
 
    def perform_create(self, serializer):
        private_key, public_key = crypto_utils.generate_rsa_key_pair()
        
        public_key_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
 
        # For this demo, we'll print the private key. In a real system, store it securely (e.g., encrypted file, HSM).
        # DO NOT DO THIS IN PRODUCTION.
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption() # No password for demo simplicity
        ).decode('utf-8')
        
        print(f"--- Election RSA Keys for new election ---")
        print(f"Public Key PEM:\n{public_key_pem}")
        print(f"Private Key PEM (SAVE THIS SECURELY - DO NOT COMMIT TO GIT IF REAL):\n{private_key_pem}")
        print(f"-------------------------------------------")
 
        self.__class__._temp_generated_private_key_pem = private_key_pem # Store on class for this request
        # Save the public key with the election
        serializer.save(rsa_public_key_pem=public_key_pem) # Pass public key to be saved on model
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer) # This now calls our perform_create which sets _temp_generated_private_key_pem
        
        headers = self.get_success_headers(serializer.data)
        
        # Add the temporarily stored private key to the response data
        response_data = serializer.data
        if hasattr(self.__class__, '_temp_generated_private_key_pem') and self.__class__._temp_generated_private_key_pem:
            response_data['temp_rsa_private_key_pem_for_display'] = self.__class__._temp_generated_private_key_pem
            del self.__class__._temp_generated_private_key_pem # Clean up after use
 
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
 
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser], url_path='tally-and-sign-results')
    def tally_and_sign_results(self, request, pk=None):
        election = self.get_object()
 
        if election.results_signature and election.tallied_results_json: # Check both
            try:
                # Attempt to parse to ensure it's valid before returning
                parsed_results = json.loads(election.tallied_results_json)
                return Response({
                    "message": "Results were already tallied and signed.",
                    "results": parsed_results, # Return the parsed object
                    "signature": election.results_signature
                }, status=status.HTTP_200_OK)
            except json.JSONDecodeError:
                # Fall through to re-tally if stored JSON is corrupt
                print(f"Warning: Corrupted tallied_results_json for election {election.id}. Re-tallying.")
 
 
        election_rsa_private_key_pem = request.data.get('election_rsa_private_key_pem')
        if not election_rsa_private_key_pem:
            return Response({"error": "Election's RSA private key PEM is required for tallying."}, status=status.HTTP_400_BAD_REQUEST)
 
        try:
            rsa_private_key_obj = serialization.load_pem_private_key(
                election_rsa_private_key_pem.encode('utf-8'),
                password=None,
                backend=crypto_utils.backend
            )
        except Exception as e:
            return Response({"error": f"Invalid or malformed RSA private key: {e}"}, status=status.HTTP_400_BAD_REQUEST)
 
        candidate_counts = {}
        # Fetch all candidates for this election once to avoid N+1 queries for names
        candidates_for_election = {c.id: c.name for c in Candidate.objects.filter(election=election)}
 
        encrypted_votes_qs = Vote.objects.filter(election=election)
        if not encrypted_votes_qs.exists():
            # Even if no votes, we might want to sign an empty result set
            election.tallied_results_json = json.dumps({}) # Store empty results
            election.results_signature = crypto_utils.sign_data({}, crypto_utils.get_system_ed25519_private_key())
            election.save()
            return Response({"message": "No votes cast to tally. Empty result set signed.", "results": {}, "signature": election.results_signature}, status=status.HTTP_200_OK)
 
        decryption_errors = 0
        for vote in encrypted_votes_qs:
            try:
                encrypted_payload_dict = json.loads(vote.encrypted_vote_data)
                decrypted_vote_data = crypto_utils.decrypt_vote(encrypted_payload_dict, rsa_private_key_obj)
                candidate_id = decrypted_vote_data.get('candidate_id')
                
                if candidate_id and candidate_id in candidates_for_election:
                    candidate_name = candidates_for_election[candidate_id]
                    candidate_counts[candidate_name] = candidate_counts.get(candidate_name, 0) + 1
                else:
                    print(f"Warning: Vote {vote.id} had invalid candidate_id '{candidate_id}' after decryption or candidate not found in election.")
                    decryption_errors += 1
            except Exception as e:
                print(f"Error decrypting vote {vote.id}: {e}")
                decryption_errors += 1 # Count as an error
 
        if decryption_errors > 0:
            print(f"Warning: {decryption_errors} vote(s) could not be decrypted or processed for election {election.id}.")
            # Decide if you want to proceed with signing if there were errors, or return an error.
            # For now, we'll proceed with what could be tallied.
 
        final_results_obj = dict(sorted(candidate_counts.items()))
        results_json_str = json.dumps(final_results_obj) # This is what will be signed
 
        try:
            system_ed25519_private_key = crypto_utils.get_system_ed25519_private_key()
            signature = crypto_utils.sign_data(final_results_obj, system_ed25519_private_key) # Sign the object
        except Exception as e:
            print(f"Error signing results: {e}")
            return Response({"error": "Could not sign election results due to a server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
        election.results_signature = signature
        election.tallied_results_json = results_json_str
        election.save()
        
        return Response({
            "message": f"Results tallied and signed successfully. {decryption_errors} vote(s) had issues during decryption.",
            "results": final_results_obj, # Send the object, not the string, so serializer can format it
            "signature": signature
        }, status=status.HTTP_200_OK)
 
class AdminCandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
 
class VoteView(generics.CreateAPIView):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer
    permission_classes = [IsAuthenticated]
 
    def perform_create(self, serializer):
        # The serializer's create method now handles setting the user.
        serializer.save()
 
    # It's often fine to use the default .create() from generics.CreateAPIView
    # if you don't need custom response messages beyond what DRF provides for success/failure.
    # However, if you want to customize, here's the corrected version:
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data) # get_serializer adds request context
        try:
            serializer.is_valid(raise_exception=True)
        except drf_serializers.ValidationError as e: # <<< USE THE IMPORTED ALIAS
            # DRF's raise_exception=True will automatically convert this to a 400 response
            # with e.detail as the body. So, re-raising is correct.
            # You could log here if needed: print(f"Validation error during vote: {e.detail}")
            raise e
            
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({"message": "Vote cast successfully!"}, status=status.HTTP_201_CREATED, headers=headers)
    
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser] # Add parsers for file uploads
 
    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request}) # Pass request to context
        return Response(serializer.data)
 
    def put(self, request): # Or PATCH for partial updates
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True, # Allow partial updates (e.g., only first_name or only picture)
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
