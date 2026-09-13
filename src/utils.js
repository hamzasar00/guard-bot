const { PermissionsBitField } = require("discord.js");
const config = require("./config");

function isOwner(userId) {
  return config.ownerIds.includes(userId);
}

function isExempt(member, settings) {
  if (!member) return false;
  return (
    isOwner(member.id) ||
    settings.whitelist.includes(member.id) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

function isStaff(member) {
  return Boolean(
    member &&
      (isOwner(member.id) ||
        member.permissions.has(PermissionsBitField.Flags.ManageGuild))
  );
}

function safeName(user) {
  return user?.tag || user?.username || user?.id || "Bilinmeyen kullanıcı";
}

function truncate(text, length = 1000) {
  const value = String(text ?? "");
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function parseBoolean(value) {
  return ["true", "on", "1", "yes", "açık", "acik", "aktif"].includes(
    String(value).toLowerCase()
  );
}

module.exports = {
  isOwner,
  isExempt,
  isStaff,
  safeName,
  truncate,
  parseBoolean
};