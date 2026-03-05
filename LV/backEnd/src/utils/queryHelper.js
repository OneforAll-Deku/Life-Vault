export const matchesQuery = (item, query) => {
    if (!query || Object.keys(query).length === 0) return true;

    for (let key in query) {
        const queryValue = query[key];
        if (queryValue === undefined) continue;

        // Handle $or
        if (key === '$or' && Array.isArray(queryValue)) {
            if (!queryValue.some(subQuery => matchesQuery(item, subQuery))) return false;
            continue;
        }

        // Handle nested keys (e.g. 'recipients.userId')
        let itemValue;
        if (key.includes('.')) {
            const parts = key.split('.');
            itemValue = item;
            for (const part of parts) {
                if (Array.isArray(itemValue)) {
                    // Special case: array of objects
                    return itemValue.some(subItem => {
                        const remainingKey = parts.slice(parts.indexOf(part)).join('.');
                        return matchesQuery(subItem, { [remainingKey]: queryValue });
                    });
                }
                itemValue = itemValue ? itemValue[part] : undefined;
            }
        } else {
            itemValue = item[key];
        }

        // Handle $in
        if (queryValue && typeof queryValue === 'object' && queryValue.$in) {
            const valuesIn = Array.isArray(queryValue.$in) ? queryValue.$in : [];
            const itemValStr = itemValue?.toString();
            if (!valuesIn.some(v => v?.toString() === itemValStr)) return false;
            continue;
        }

        // Handle comparison operators ($gte, $lte, $gt, $lt, $ne, $exists)
        if (queryValue && typeof queryValue === 'object') {
            if (queryValue.$ne !== undefined) {
                if (itemValue?.toString() === queryValue.$ne?.toString()) return false;
                continue;
            }
            if (queryValue.$exists !== undefined) {
                const exists = itemValue !== undefined && itemValue !== null;
                if (queryValue.$exists !== exists) return false;
                continue;
            }
            if (queryValue.$gte !== undefined) {
                if (!(new Date(itemValue) >= new Date(queryValue.$gte))) return false;
                continue;
            }
            if (queryValue.$lte !== undefined) {
                if (!(new Date(itemValue) <= new Date(queryValue.$lte))) return false;
                continue;
            }
            if (queryValue.$gt !== undefined) {
                if (!(new Date(itemValue) > new Date(queryValue.$gt))) return false;
                continue;
            }
            if (queryValue.$lt !== undefined) {
                if (!(new Date(itemValue) < new Date(queryValue.$lt))) return false;
                continue;
            }
        }

        // Handle basic comparison
        if (itemValue?.toString() !== queryValue?.toString()) return false;
    }
    return true;
};

export class Query {
    constructor(results) {
        this.results = results || [];
    }

    sort(options) {
        if (!options) return this;
        // Simple mock sort logic if needed, but for now just returning this
        // In a real scenario, you'd sort this.results here
        return this;
    }

    limit(n) {
        if (typeof n === 'number' && n > 0) {
            this.results = this.results.slice(0, n);
        } else if (typeof n === 'string') {
            const num = parseInt(n);
            if (!isNaN(num)) this.results = this.results.slice(0, num);
        }
        return this;
    }

    skip(n) {
        if (typeof n === 'number' && n >= 0) {
            this.results = this.results.slice(n);
        } else if (typeof n === 'string') {
            const num = parseInt(n);
            if (!isNaN(num)) this.results = this.results.slice(num);
        }
        return this;
    }

    select() { return this; }
    populate() { return this; }
    lean() { return this; }

    // Make it thenable so it can be awaited
    then(onFulfilled, onRejected) {
        return Promise.resolve(this.results).then(onFulfilled, onRejected);
    }
}
