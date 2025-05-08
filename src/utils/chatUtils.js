const isGroupChat = (chat) => {
  return chat.type === 'group' || chat.type === 'supergroup';
};

module.exports = {
  isGroupChat
}; 