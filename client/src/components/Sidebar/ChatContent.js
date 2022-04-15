import React, { useMemo } from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: 20,
    flexGrow: 1,
  },
  username: {
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  previewText: {
    fontWeight: hasUnreadMessages => hasUnreadMessages ? 900 : 400,
    fontSize: 12,
    color: hasUnreadMessages => hasUnreadMessages ? "#000000" : "#9CADC8",
    letterSpacing: -0.17,
  },
  unreadMessagesCount: {
    alignSelf: "center",
    background: "#3F92FF",
    borderRadius: "20px",
    color: "#ffffff",
    marginRight: "10px",
    minWidth: "30px",
    padding: "5px",
    textAlign: "center",
  },
}));

const ChatContent = ({ conversation }) => {
  const { unreadMessagesCount } = conversation;

  const { otherUser } = conversation;
  const latestMessageText = conversation.id && conversation.latestMessageText;
  const hasUnreadMessages = unreadMessagesCount > 0;
  const classes = useStyles(hasUnreadMessages);

  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.username}>
          {otherUser.username}
        </Typography>
        <Typography className={classes.previewText}>
          {latestMessageText}
        </Typography>
      </Box>
      {hasUnreadMessages &&
        <Box className={classes.unreadMessagesCount}>
          {unreadMessagesCount}
        </Box>
      }
    </Box>
  );
};

export default ChatContent;
