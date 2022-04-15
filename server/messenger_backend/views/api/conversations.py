from datetime import datetime, timezone
from django.contrib.auth.middleware import get_user
from django.db.models import Q
from django.db.models.query import Prefetch
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation, Message
from online_users import online_users
from rest_framework.views import APIView
from rest_framework.request import Request


class Conversations(APIView):
    """get all conversations for a user, include latest message text for preview, and all messages
    include other user model so we have info on username/profile pic (don't include current user info)
    TODO: for scalability, implement lazy loading"""

    def get(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)
            user_id = user.id

            conversations = (
                Conversation.objects.filter(Q(user1=user_id) | Q(user2=user_id))
                .prefetch_related(
                    Prefetch(
                        "messages", queryset=Message.objects.order_by("createdAt")
                    )
                )
                .all()
            )

            conversations_response = []

            for convo in conversations:
                convo_dict = {
                    "id": convo.id,
                    "messages": [
                        message.to_dict(["id", "text", "senderId", "createdAt", "readAt"])
                        for message in convo.messages.all()
                    ],
                    "unreadMessagesCount": Message.received_unread_messages_count(convo.id, user_id),
                }

                # set properties for notification count and latest message preview
                convo_dict["latestMessageText"] = convo_dict["messages"][-1]["text"]

                # set a property "otherUser" so that frontend will have easier access
                user_fields = ["id", "username", "photoUrl"]
                if convo.user1 and convo.user1.id != user_id:
                    convo_dict["otherUser"] = convo.user1.to_dict(user_fields)
                elif convo.user2 and convo.user2.id != user_id:
                    convo_dict["otherUser"] = convo.user2.to_dict(user_fields)

                last_read_message = Message.last_read_message(convo.id, convo_dict["otherUser"]["id"])
                 
                convo_dict["otherUser"]["lastReadMessageId"] = last_read_message.id if last_read_message else None

                # set property for online status of the other user
                if convo_dict["otherUser"]["id"] in online_users:
                    convo_dict["otherUser"]["online"] = True
                else:
                    convo_dict["otherUser"]["online"] = False

                conversations_response.append(convo_dict)
            conversations_response.sort(
                key=lambda convo: convo["messages"][-1]["createdAt"],
                reverse=True,
            )
            return JsonResponse(
                conversations_response,
                safe=False,
            )
        except Exception as e:
            print(e)
            return HttpResponse(status=500)

class ReadConversationMessages(APIView):
    def put(self, request: Request, **kwargs):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)

            conversation_id = kwargs.get('id')
            conversation = Conversation.objects.get(id=conversation_id)

            if user.id not in [conversation.user1.id, conversation.user2.id]:
                return HttpResponse(status=401)

            unread_messages = (
                Message.objects.filter(
                        conversation__id=conversation_id
                    ).filter(
                        Q(readAt=None) &
                        ~Q(senderId=user.id)
                    )
            )

            unread_messages.update(readAt=datetime.now(tz=timezone.utc))
            messages = (
                Message.objects.filter(
                    conversation__id=conversation_id
                ).order_by("createdAt")
            )

            conversation_response = {
                "conversationId": conversation_id,
                "messages": [
                    message.to_dict(["id", "text", "senderId", "createdAt", "readAt"])
                    for message in messages.all()
                ],
                "unreadMessagesCount": 0,
            }

            return JsonResponse(
                conversation_response,
                safe=False,
            )
        except Exception as e:
            print(e)
            return HttpResponse(status=500)
