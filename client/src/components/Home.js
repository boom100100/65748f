import React, { useCallback, useEffect, useState, useContext } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { Grid, CssBaseline, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { SidebarContainer } from "../components/Sidebar";
import { ActiveChat } from "../components/ActiveChat";
import { SocketContext } from "../context/socket";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post("/api/messages", body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit("new-message", {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const putMessagesRead = async (body) => {
    const { data } = await axios.put("/api/conversations", body);
    return data;
  };

  const sendMessagesRead = (data, body) => {
    socket.emit("read-messages", {
      conversation: data.conversation,
      userId: body.userId,
      otherUserId: body.otherUserId,
    });
  };

  const postMessage = (body) => {
    try {
      const data = saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };
  const markMessagesAsRead = async (body) => {
    try {
      const conversation = conversations.find(c => c.id === body.conversationId);
      if (!conversation) {
        return;
      }

      const messages = conversation.messages;

      const highestMessageIndex = messages.length ?? 0;
      for (let i = highestMessageIndex; i >= 0; i--) {
        const message = messages[i];

        if (message.senderId !== body.userId && message.readAt == null) {
          const data = await putMessagesRead(body);

          setMessagesRead(data);

          sendMessagesRead(data, body);

          break;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  const addNewConvo = useCallback(
    (recipientId, message) => {
      conversations.forEach((convo) => {
        if (convo.otherUser.id === recipientId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
          convo.id = message.conversationId;
        }
      });
      setConversations(conversations);
    },
    [setConversations, conversations],
  );

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => [newConvo, ...prev]);
      }

      conversations.forEach((convo) => {
        if (convo.id === message.conversationId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
        }
      });
      setConversations(conversations);
    },
    [setConversations, conversations],
  );

  const setMessagesRead = useCallback(
    (data) => {
      const { messages, conversationId } = data;
      const messagesById = {}
      
      messages.forEach(
        (message) => messagesById[message.id.toString()] = message
      );

      setConversations((prev) =>
        prev.map(
          (convo) => {
            if (convo.id === conversationId) {
              const updatedMessages = convo.messages.map(
                (message) => ({
                  ...message,
                  readAt: messagesById[message.id.toString()].readAt,
                })
              );

              return ({ ...convo, messages: [...updatedMessages] });
            }
            return convo;
          }
          ));
    },
    [setConversations]
  );

  const setActiveChat = (username) => {
    setActiveConversation(username);
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on("add-online-user", addOnlineUser);
    socket.on("remove-offline-user", removeOfflineUser);
    socket.on("new-message", addMessageToConversation);
    socket.on("read-messages", setMessagesRead);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off("add-online-user", addOnlineUser);
      socket.off("remove-offline-user", removeOfflineUser);
      socket.off("new-message", addMessageToConversation);
      socket.off("read-messages", setMessagesRead);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, setMessagesRead, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push("/login");
      else history.push("/register");
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get("/api/conversations");
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          markMessagesAsRead={markMessagesAsRead}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
