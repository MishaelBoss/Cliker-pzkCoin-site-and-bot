from django.urls import path
from .views import *
from . import views

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login_view'),
    path('logout/', views.logout_view, name='logout_view'),
    path('api/profile/', views.profile_view, name='profile_view'),
    path('coins/', views.get_coins_view, name='get_coins_view'),
    path('is_authenticated/', views.is_login_view, name='is_login_view'),
    path('add_product/', views.add_product_view, name='add_product_view'),
    path('list_product/', views.list_product_view, name='list_product_view'),
    path('basket/', views.get_basket_view),
    path('basket/count/', views.get_basket_count_view),
    path('basket/add/', views.add_to_basket_view),
    path('basket/remove/', views.remove_basket_view),
    path('basket/delete/<int:item_id>/', views.delete_from_basket_view),
]