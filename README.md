socket io server 
run on local host port 8080
save the messages in two local json files:
1 - for public messages
2 - for all privet messages
in format:
{
msgId:
{message data}
}

save all messages keys (each key is the msg id) for each user in json file
in format
:{
"someUserName":
[...list of all msgId`s...]
}

user has option to send privat/public message and delete message
