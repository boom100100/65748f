from django.db import models

from . import utils
from .conversation import Conversation


class Message(utils.CustomModel):
    text = models.TextField(null=False)
    senderId = models.IntegerField(null=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        db_column="conversationId",
        related_name="messages",
        related_query_name="message"
    )
    createdAt = models.DateTimeField(auto_now_add=True, db_index=True)
    updatedAt = models.DateTimeField(auto_now=True)
    readAt = models.DateTimeField(null=True)

    
    def received_unread_messages_count(conversation_id, user_id):
        return Message.objects.filter(
            conversation__id=conversation_id
        ).filter(
            ~models.Q(senderId=user_id) &
            models.Q(readAt=None)
        ).count()

    def last_read_message(conversation_id, user_id):
        return Message.objects.filter(
            conversation__id=conversation_id
        ).filter(
            ~models.Q(senderId=user_id) &
            ~models.Q(readAt=None)
        ).order_by("createdAt").last()
