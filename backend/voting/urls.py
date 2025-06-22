from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserCreateView, ElectionViewSet, AdminElectionViewSet, 
    AdminCandidateViewSet, VoteView, UserProfileView,
    AdminUserViewSet, VerifyEmailView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView, SubmitVoteCommitmentView
)

router = DefaultRouter()
router.register(r'elections', ElectionViewSet, basename='election') # For voters
router.register(r'admin/elections', AdminElectionViewSet, basename='admin-election') # For admins
router.register(r'admin/candidates', AdminCandidateViewSet, basename='admin-candidate') # For admins

# --- THIS IS THE ROUTER REGISTRATION TO VERIFY OR ADD ---
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
# --- END OF ROUTER REGISTRATION VERIFICATION ---

urlpatterns = [
    path('register/', UserCreateView.as_view(), name='user-register'),
    path('vote/', VoteView.as_view(), name='cast-vote'),
    path('', include(router.urls)),
    path('user/me/', UserProfileView.as_view(), name='user-profile'),
    path('verify-email/<uuid:token_value>/', VerifyEmailView.as_view(), name='verify-email'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
     path('vote/commit/', SubmitVoteCommitmentView.as_view(), name='vote-commit'),
]