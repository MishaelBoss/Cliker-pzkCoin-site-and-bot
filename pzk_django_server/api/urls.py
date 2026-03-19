from django.urls import path
from . import views

urlpatterns = [
    path('top/', views.get_top_players, name='top_players'),
    path('player/<str:name>/', views.get_player, name='get_player'),
    path('update/', views.update_player, name='update_player'),
    path('all/', views.get_all_players, name='all_players'),
    path('clear/', views.clear_all, name='clear_all'),
    path('remote/deduct-coins/', views.remote_deduct_coins, name='remote_deduct_coins'),
    path('player/id/<int:tg_id>/', views.get_player_by_id, name='get_player_by_id')
]