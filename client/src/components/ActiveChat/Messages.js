import React, { useEffect } from 'react';
import { Box } from '@material-ui/core';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const Messages = (props) => {
  const { markMessagesAsRead, messages, otherUser, userId } = props;

  useEffect(
    () => {
      if (!!messages) {
        return;
      }
      const reqBody = {
        userId,
        conversationId: messages[0].conversationId,
        otherUserId: messages[0].otherUser.id,
      };
      markMessagesAsRead(reqBody);
    },
    [markMessagesAsRead, messages, userId]
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
