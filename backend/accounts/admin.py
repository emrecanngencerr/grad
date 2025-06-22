from django.contrib import admin

# Register your models here.
# backend/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser # Or from django.contrib.auth import get_user_model; User = get_user_model()

class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active', 'email_verified')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups', 'email_verified')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    # Add your custom fields to fieldsets if needed for the detail view
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Info', {'fields': ('identity_number', 'birth_date', 'profile_picture', 'email_verified')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'first_name', 'last_name', 'identity_number', 'birth_date')}),
    )
    # For creation form in admin
    # add_form = YourCustomUserCreationForm (more advanced)

admin.site.register(CustomUser, CustomUserAdmin)