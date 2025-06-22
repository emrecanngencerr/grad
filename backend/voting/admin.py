from django.contrib import admin
from django.utils.html import format_html # For photo_preview and prettified JSON
from .models import Election, Candidate, Vote, EmailVerificationToken # Ensure all models are imported
import json

@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_time', 'end_time', 'is_active', 'is_open_for_voting_display')
    list_filter = ('is_active', 'start_time')
    search_fields = ('name',)

    def is_open_for_voting_display(self, obj):
        return obj.is_open_for_voting
    is_open_for_voting_display.short_description = 'Is Open?'
    is_open_for_voting_display.boolean = True


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'election_link', 'has_photo_display')
    list_filter = ('election__name',) # Filter by election name
    search_fields = ('name', 'election__name')
    readonly_fields = ('photo_preview',)
    list_select_related = ('election',) # Optimize query for election name

    def election_link(self, obj):
        from django.urls import reverse
        link = reverse("admin:voting_election_change", args=[obj.election.id]) # Assumes app_label is 'voting'
        return format_html('<a href="{}">{}</a>', link, obj.election.name)
    election_link.short_description = 'Election'
    election_link.admin_order_field = 'election__name'

    def has_photo_display(self, obj):
        return bool(obj.photo)
    has_photo_display.short_description = 'Has Photo?'
    has_photo_display.boolean = True

    def photo_preview(self, obj):
        if obj.photo and hasattr(obj.photo, 'url'):
            return format_html('<img src="{}" style="max-height: 150px; max-width: 150px;" />', obj.photo.url)
        return "(No photo)"
    photo_preview.short_description = 'Photo Preview'


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'election_link', 'vote_status_display', 'voted_at')
    list_filter = ('election__name', 'user__email')
    readonly_fields = ('user', 'election', 'voted_at', 'encrypted_vote_data_prettified') # Made user/election read-only
    search_fields = ('user__email', 'election__name')
    list_select_related = ('user', 'election') # Optimize queries

    def user_display(self, obj):
        # Assuming user has an email field and it's the primary identifier for display
        if obj.user:
            return obj.user.email 
        return "N/A"
    user_display.short_description = 'User (Email)'
    user_display.admin_order_field = 'user__email'

    def election_link(self, obj):
        from django.urls import reverse
        if obj.election:
            link = reverse("admin:voting_election_change", args=[obj.election.id])
            return format_html('<a href="{}">{}</a>', link, obj.election.name)
        return "N/A"
    election_link.short_description = 'Election'
    election_link.admin_order_field = 'election__name'

    def vote_status_display(self, obj):
        if obj.encrypted_vote_data:
            return "Encrypted"
        return "No vote data"
    vote_status_display.short_description = 'Vote Status'

    def encrypted_vote_data_prettified(self, obj):
        if obj.encrypted_vote_data:
            try:
                data = json.loads(obj.encrypted_vote_data)
                return format_html("<pre>{}</pre>", json.dumps(data, indent=2, sort_keys=True))
            except json.JSONDecodeError:
                return obj.encrypted_vote_data
        return "N/A"
    encrypted_vote_data_prettified.short_description = 'Encrypted Vote Payload'


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user_email_display', 'token_display', 'created_at', 'expires_at', 'is_token_expired_display')
    list_filter = ('created_at', 'expires_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('user', 'token', 'created_at', 'expires_at') # These usually shouldn't be edited
    list_select_related = ('user',) # Optimize user fetching

    def user_email_display(self, obj):
        if obj.user:
            return obj.user.email
        return "N/A"
    user_email_display.short_description = 'User Email'
    user_email_display.admin_order_field = 'user__email'

    def token_display(self, obj): # To show only part of long token in list view
        return f"{str(obj.token)[:8]}..."
    token_display.short_description = "Token (Start)"

    def is_token_expired_display(self, obj):
        return obj.is_expired()
    is_token_expired_display.short_description = 'Is Expired?'
    is_token_expired_display.boolean = True