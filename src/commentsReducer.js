import { nanoid } from "nanoid/non-secure/index";

const setComment = (comments, id, merge) => ({
  ...comments,
  [id]: {
    ...comments[id],
    ...merge
  }
});


const reducer = (comments = {}, action, owner) => {
  if (owner && owner.onCommentsAction) {
    owner.onCommentsAction(comments, action, nanoid)
  }
  switch (action.type) {
    case "RE_INIT": {
      return { ...action.comments }
    }
    case "CLEAR": {
      return {}
    }
    case "ADD_COMMENT": {
      const comment = action.comment || {
        id: action.id || nanoid(10),
        text: "",
        x: action.x,
        y: action.y,
        width: 200,
        height: 30,
        color: "blue",
        isNew: true
      };
      return {
        ...comments,
        [comment.id]: comment
      };
    }
    case "ADD_COMMENTS": {
      const { comments: add_comments } = action;
      return {
        ...comments,
        ...add_comments
      }
    } break
    case "REMOVE_COMMENT_NEW":
      const { isNew: toDelete, ...comment } = comments[action.id];
      return {
        ...comments,
        [action.id]: comment
      };
    case "SET_COMMENT_COORDINATES": {
      return setComment(comments, action.id, { x: action.x, y: action.y });
    }
    case "SET_COMMENT_DIMENSIONS": {
      return setComment(comments, action.id, {
        width: action.width,
        height: action.height
      });
    }
    case "SET_COMMENT_TEXT": {
      return setComment(comments, action.id, { text: action.text });
    }
    case "SET_COMMENT_COLOR": {
      return setComment(comments, action.id, { color: action.color });
    }
    case "DELETE_COMMENT": {
      const { [action.id]: toDelete, ...newComments } = comments;
      return newComments;
    }
    case "DELETE_COMMENTS": {
      for (const id of action.ids) {
        delete comments[id]
      }
      return { ...comments }
    }
    default:
      return comments;
  }
};

export function connectCommentsReducer(owner) {
  return (comments = {}, action) => reducer(comments, action, owner)
}

export default reducer
