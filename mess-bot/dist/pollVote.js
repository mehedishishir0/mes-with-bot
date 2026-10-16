"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectedMealCount = selectedMealCount;
const crypto_1 = require("crypto");
// Baileys emits decrypted option hashes in messages.update.
function selectedMealCount(poll, vote) {
    const selected = vote.selectedOptions || [];
    if (selected.length === 0)
        return 0;
    if (selected.length !== 1)
        return null;
    const option = poll.options?.find((candidate) => Buffer.from(selected[0]).equals((0, crypto_1.createHash)('sha256').update(candidate.optionName || '').digest()));
    const match = option?.optionName?.match(/^([0-6]) টি/);
    return match ? Number(match[1]) : null;
}
