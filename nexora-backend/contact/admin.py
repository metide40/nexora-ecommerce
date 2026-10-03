from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "short_message", "created_at", "is_read"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["name", "email", "message"]
    list_editable = ["is_read"]
    readonly_fields = ["name", "email", "message", "created_at"]  # keep the original intact
    actions = ["mark_read", "mark_unread"]

    def has_add_permission(self, request):
        return False  # messages only come from the website

    @admin.display(description="Message")
    def short_message(self, obj):
        return obj.message[:60] + ("..." if len(obj.message) > 60 else "")

    @admin.action(description="Mark selected as read")
    def mark_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description="Mark selected as unread")
    def mark_unread(self, request, queryset):
        queryset.update(is_read=False)
