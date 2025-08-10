// src/models/token.model.js
import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  access_token: { type: String },
  refresh_token: { type: String },
  scope: { type: String },
  token_type: { type: String },
  expires_at: { type: Date } // when the access_token expires
}, { timestamps: true });

const Token = mongoose.model('Token', TokenSchema);

export default Token;
