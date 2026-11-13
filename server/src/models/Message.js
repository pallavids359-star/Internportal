const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  channel: { type: String, required: true }, // announcements | general | team:<id> | dm:<idA>:<idB>
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 4000 },
}, { timestamps: true });
schema.index({ channel: 1, createdAt: -1 });
module.exports = mongoose.model('Message', schema);
