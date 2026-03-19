from django.contrib import admin
from .models import Player, RatingHistory

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ['name', 'coins', 'clicks', 'level', 'last_update']
    search_fields = ['name']
    list_filter = ['level']

@admin.register(RatingHistory)
class RatingHistoryAdmin(admin.ModelAdmin):
    list_display = ['player_name', 'coins', 'clicks', 'recorded_at']
    search_fields = ['player_name']
    list_filter = ['recorded_at']