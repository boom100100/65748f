import React, { useEffect } from 'react';
import { Box } from '@material-ui/core';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const Messages = (props) => {
  const { id: conversationId, messages, otherUser } = props.conversation;
  const { markMessagesAsRead, userId } = props;

  useEffect(
    () => {
      if (!messages.length) {
        return;
      }
      const reqBody = {
        conversationId,
        otherUserId: otherUser.id,
      };
      markMessagesAsRead(reqBody);
    },
    [conversationId, markMessagesAsRead, messages, otherUser.id, userId]
  );

  return (
    <Box>
      {messages.map((message) => {
        const time = moment(message.createdAt).format('h:mm');

        return message.senderId === userId ? (
          <SenderBubble key={message.id} text={message.text} time={time} />
        ) : (
          <OtherUserBubble
            key={message.id}
            text={message.text}
            time={time}
            otherUser={otherUser}
          />
        );
      })}
    </Box>
  );
};

export default Messages;
