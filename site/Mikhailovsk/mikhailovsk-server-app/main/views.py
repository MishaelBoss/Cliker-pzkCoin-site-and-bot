from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
import json, requests
from django.views.decorators.csrf import csrf_exempt
from .models import *
from django.shortcuts import get_object_or_404
from django.db.models import Sum 


@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if User.objects.filter(username=username).exists():
            return JsonResponse({'Такой пользователь есть': username});

        new_user = User.objects.create_user(username=username, password=password)
        profile = Profile.objects.create(user=new_user)

        login(request, new_user);

        return JsonResponse({'is_authenticated': True, 'username': new_user.username});
    return JsonResponse({'Error create user': new_user.username})


@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'is_authenticated': True, 'username': user.username});
        else:
            return JsonResponse({'error': f'Пользователь {username} не найден или пароль неверен'}, status=401)
    return JsonResponse({'Error login user': user.username});


@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        logout(request)
        
        response = JsonResponse({'is_authenticated': False, 'message': 'Вы вышли'})
        
        response.delete_cookie('sessionid')
        response.delete_cookie('csrftoken')
        
        response.set_cookie('sessionid', '', max_age=0, expires=0)
        
        return response
    
    return JsonResponse({'error': 'Только POST'}, status=405)


def is_login_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "is_authenticated": True,
            "username": request.user.username,
            "email": request.user.email
        })
    return JsonResponse({'is_authenticated': False})


def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    profile = get_object_or_404(Profile, user=request.user)
    return JsonResponse(profile)


def get_telegram_id_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    profile = get_object_or_404(Profile, user=request.user)
    return JsonResponse({"telegram_id": profile.telegram_id})


def get_coins_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    
    profile = get_object_or_404(Profile, user=request.user)

    count = profile.coins
    
    return JsonResponse({'coins': count})


def add_product_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        product = Product.objects.create(
            author = request.user,
            title = data['title'],
            image = data['image'],
            price = data['price'],
            discount = 0,
        )
        product.save()
    return JsonResponse({'message': product.title})


def list_product_view(request):
    products = Product.objects.all()
    user_discounts = {}

    if request.user.is_authenticated:
        user_discounts = {d.product_id: d.discount_value for d in request.user.my_discounts.all()}

    data = []

    for p in products:
        personal_discount = user_discounts.get(p.id, 0)
        total_discount = min(p.discount + personal_discount, 90)

        data.append({
            "id": p.id,
            "title": p.title,
            "realPrice": p.price,
            "discount": total_discount,
            "isPercent": p.isPercent,
            "image": p.image.url if p.image else "" 
        })
    return JsonResponse(data, safe=False)


@csrf_exempt
def add_to_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        product = get_object_or_404(Product, id=data['product_id'])

        item, created = Basket.objects.get_or_create(
            user = request.user,
            product = product
        )
        
        if not created: 
            item.count += 1
            item.save()

        return JsonResponse({'message': 'Add to basket product'})
    

@csrf_exempt
def remove_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not authenticated'})
    if request.method == 'POST':
        data = json.loads(request.body)
        item = Basket.objects.get(user=request.user, product_id=data['product_id'])

        if item.count > 1:
            item.count -= 1
            item.save()
        else:
            item.delete()
    return JsonResponse({'message': 'Add to basket product'})
    

def get_basket_view(request):
    if not request.user.is_authenticated:
        return JsonResponse([], safe=False)
    
    user_discounts = {
        d.product_id: d.discount_value
        for d in request.user.my_discounts.filter(is_used=False)
    }

    items = Basket.objects.filter(user=request.user).select_related('product')
    data = []

    for b in items:
        product = b.product

        personal_discount = user_discounts.get(product.id)
        current_discount = personal_discount if personal_discount is not None else product.discount

        total_discount = min(b.product.discount + current_discount, 90)

        data.append({
            "id": b.id,
            "count": b.count,
            "product": {
                "id": product.id,
                "title": product.title,
                "price": product.price,
                "discount": total_discount,
                "isPercent": product.isPercent,
                "image": product.image.url if product.image else ""
            }
        })
    return JsonResponse(data, safe=False)


def get_basket_count_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'total_count': 0})

    total = request.user.basket_items.aggregate(total=Sum('count'))['total'] or 0
    
    return JsonResponse({'total_count': total})


def delete_from_basket_view(request, item_id):
    item = get_object_or_404(Basket, id=item_id, user=request.user)
    item.delete()
    return JsonResponse({'message': 'delete'})


@csrf_exempt
def update_profile_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        tg_id = data.get('telegram_id')
        
        profile = request.user.profile

        try:
            profile.telegram_id = tg_id
            profile.save()
            return JsonResponse({'status': 'ok'})
        except:
            return JsonResponse({'error': 'Этот Telegram ID уже привязан к другому аккаунту'}, status=400)


@csrf_exempt
def sync_coins_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        tg_id = data.get('telegram_id')
        coins = data.get('coins')

        profile = Profile.objects.filter(telegram_id=tg_id).first()
        
        if profile:
            if coins > profile.coins:
                profile.coins = coins
                profile.save()
            return JsonResponse({'status': 'updated'})
            
    return JsonResponse({'status': 'error'}, status=400)


@csrf_exempt
def buy_discount_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    # 1. Распаковываем данные от Next.js
    data = json.loads(request.body)
    p_id = data.get('product_id')
    profile = request.user.profile

    if not profile.telegram_id:
        return JsonResponse({'error': 'Привяжите Telegram в профиле'}, status=400)

    try:
        remote_url = "http://localhost:8010/api/remote/deduct-coins/" 
        
        response = requests.post(remote_url, json={
            "telegram_id": profile.telegram_id,
            "amount": 250,
            "api_key": "cr2032" # Твой секретный ключ
        }, timeout=5)
        
        if response.status_code == 200:
            # 3. Создаем скидку на сайте
            UserDiscount.objects.get_or_create(
                user=request.user, 
                product_id=p_id,
                defaults={'discount_value': 10}
            )
            
            # 4. Обновляем баланс в локальной БД из ответа сервера бота
            new_balance = response.json().get('new_balance')
            profile.coins = new_balance
            profile.save()
            
            return JsonResponse({'status': 'success', 'new_balance': new_balance})
        else:
            return JsonResponse({'error': 'Ошибка сервера игры или мало монет'}, status=response.status_code)
            
    except Exception as e:
        return JsonResponse({'error': f'Нет связи с сервером бота: {str(e)}'}, status=500)
    

def get_actual_coins(request):
    profile = request.user.profile
    
    if not profile.telegram_id:
        return JsonResponse({'coins': profile.coins, 'error': 'ID не привязан'})

    try:
        remote_url = f"http://127.0.0.1:8010/api/player/id/{profile.telegram_id}/"
        res = requests.get(remote_url, timeout=2)
        
        if res.ok:
            data = res.json()
            profile.coins = data.get('coins', 0)
            profile.save()
            return JsonResponse({'coins': profile.coins})
            
    except Exception as e:
        print(f"Ошибка связи с ботом: {e}")
        
    return JsonResponse({'coins': profile.coins})