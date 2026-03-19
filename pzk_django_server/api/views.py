from django.db.models import Count, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Player, RatingHistory
from .serializers import PlayerSerializer, PlayerUpdateSerializer
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@api_view(['GET'])
def get_top_players(request):
    """Получить топ-10 игроков"""
    players = Player.objects.all()[:10]
    serializer = PlayerSerializer(players, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_player(request, name):
    """Получить данные конкретного игрока"""
    try:
        player = Player.objects.get(name=name)
        serializer = PlayerSerializer(player)
        return Response(serializer.data)
    except Player.DoesNotExist:
        return Response({
            'name': name,
            'coins': 0,
            'clicks': 0,
            'level': 1,
            'rank': '-'
        })

@api_view(['POST'])
def update_player(request):
    """Обновить данные игрока"""
    serializer = PlayerUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data

    tg_id = data.get('telegram_id')
    
    # Сохраняем в историю
    RatingHistory.objects.create(
        player_name=data['name'],
        coins=data['coins'],
        clicks=data['clicks']
    )

    player, created = Player.objects.update_or_create(
        name=data['name'],
        defaults={
            'telegram_id': tg_id,
            'coins': data['coins'],
            'clicks': data['clicks'],
            'level': data['level']
        }
    )
    
    # Возвращаем обновленный топ-10
    top_players = Player.objects.all()[:10]
    top_serializer = PlayerSerializer(top_players, many=True)
    
    return Response({
        'success': True,
        'player': PlayerSerializer(player).data,
        'top10': top_serializer.data
    })

@api_view(['GET'])
def get_all_players(request):
    """Получить всех игроков (для админа)"""
    players = Player.objects.all()
    serializer = PlayerSerializer(players, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
def clear_all(request):
    """Очистить все данные (для тестов)"""
    Player.objects.all().delete()
    RatingHistory.objects.all().delete()
    return Response({'success': True})


@api_view(['GET'])
def get_player_by_id(request, tg_id):
    try:
        player = Player.objects.get(telegram_id=tg_id)
        return Response({
            'name': player.name,
            'coins': player.coins,
            'level': player.level,
            'clicks': player.clicks
        })
    except Player.DoesNotExist:
        return Response({'coins': 0, 'level': 1}, status=404)


@csrf_exempt
def remote_deduct_coins(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(f"--- [БОТ] Получен запрос: {data}") # Увидим, что пришло

            # 1. Проверка ключа (Проверь, чтобы на сайте был такой же!)
            if data.get('api_key') != "cr2032":
                print("--- [БОТ] Ошибка: Неверный API-ключ")
                return JsonResponse({'error': 'Forbidden'}, status=403)

            tg_id = data.get('telegram_id')
            amount = data.get('amount')

            # 2. Ищем игрока
            player = Player.objects.filter(telegram_id=tg_id).first()
            if not player:
                print(f"--- [БОТ] Ошибка: Игрок с ID {tg_id} не найден")
                return JsonResponse({'error': 'Player not found'}, status=404)

            # 3. Проверка баланса
            if player.coins < amount:
                print(f"--- [БОТ] Ошибка: Мало монет ({player.coins} < {amount})")
                return JsonResponse({'error': 'Insufficient funds'}, status=400)

            # 4. Списание
            player.coins -= amount
            player.save()
            print(f"--- [БОТ] Успех! Новый баланс: {player.coins}")
            return JsonResponse({'status': 'success', 'new_balance': player.coins})

        except Exception as e:
            print(f"--- [БОТ] Ошибка обработки запроса: {e}")
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Method not allowed'}, status=405)