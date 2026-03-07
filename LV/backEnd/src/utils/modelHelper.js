
/**
 * Applies a Mongoose-style update object to a model instance.
 * Supports: $set, $push, $pull, $addToSet, $inc, $unset
 */
export const applyUpdate = (item, update) => {
    if (!update) return item;

    // If update is simple (no $ operators), treat as $set
    const keys = Object.keys(update);
    const hasOperators = keys.some(key => key.startsWith('$'));

    if (!hasOperators) {
        Object.assign(item, update);
        return item;
    }

    // Handle $set
    if (update.$set) {
        Object.assign(item, update.$set);
    }

    // Handle fields not in $set but in root (if they don't start with $)
    for (const [key, value] of Object.entries(update)) {
        if (!key.startsWith('$')) {
            item[key] = value;
        }
    }

    // Handle $push
    if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
            if (!Array.isArray(item[key])) item[key] = [];
            item[key].push(value);
        }
    }

    // Handle $addToSet
    if (update.$addToSet) {
        for (const [key, value] of Object.entries(update.$addToSet)) {
            if (!Array.isArray(item[key])) item[key] = [];
            const exists = item[key].some(i => i?.toString() === value?.toString());
            if (!exists) item[key].push(value);
        }
    }

    // Handle $pull
    if (update.$pull) {
        for (const [key, value] of Object.entries(update.$pull)) {
            if (Array.isArray(item[key])) {
                item[key] = item[key].filter(i => i?.toString() !== value?.toString());
            }
        }
    }

    // Handle $inc
    if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
            item[key] = (item[key] || 0) + value;
        }
    }

    // Handle $unset
    if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
            delete item[key];
        }
    }

    return item;
};
