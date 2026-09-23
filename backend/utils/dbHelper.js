const mongoose = require('mongoose');

/**
 * Returns a MongoDB query condition for userId that matches
 * either string representation or BSON ObjectId representation.
 */
function toUserQuery(userId) {
  if (!userId) return userId;
  const s = userId.toString();
  if (mongoose.Types.ObjectId.isValid(s)) {
    return { $in: [s, new mongoose.Types.ObjectId(s)] };
  }
  return s;
}

/**
 * Normalizes an _id query condition to match either string or ObjectId.
 */
function toIdQuery(id) {
  if (!id) return id;
  const s = id.toString();
  if (mongoose.Types.ObjectId.isValid(s)) {
    return { $in: [s, new mongoose.Types.ObjectId(s)] };
  }
  return s;
}

module.exports = {
  toUserQuery,
  toIdQuery
};
