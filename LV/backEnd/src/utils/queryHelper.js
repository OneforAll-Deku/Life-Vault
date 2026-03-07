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
            const valuesIn = Array.isArray(queryValue.$in) ? queryValue.$in : [queryValue.$in];
            const itemVals = Array.isArray(itemValue) ? itemValue : [itemValue];

            if (!itemVals.some(iv => valuesIn.some(v => {
                if (v instanceof RegExp) return v.test(iv?.toString() || '');
                return v?.toString() === iv?.toString();
            }))) {
                return false;
            }
            continue;
        }

        // Handle $regex
        if (queryValue && typeof queryValue === 'object' && queryValue.$regex) {
            const pattern = queryValue.$regex;
            const options = queryValue.$options || '';
            const regex = new RegExp(pattern, options);
            if (!regex.test(itemValue?.toString() || '')) return false;
            continue;
        }

        // Handle direct RegExp
        if (queryValue instanceof RegExp) {
            if (!queryValue.test(itemValue?.toString() || '')) return false;
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
    constructor(resultsOrPromise, filter = null) {
        if (resultsOrPromise instanceof Promise) {
            this.promise = resultsOrPromise;
            this.results = null;
        } else {
            this.promise = null;
            this.results = Array.isArray(resultsOrPromise) ? resultsOrPromise : [];
        }
        this.queryFilter = filter;
    }

    async _getResults() {
        if (this.promise) {
            this.results = await this.promise;
            this.promise = null; // Mark as resolved
        }
        if (this.queryFilter && this.results) {
            this.results = this.results.filter(item => matchesQuery(item, this.queryFilter));
            this.queryFilter = null; // Mark as filtered
        }
        return this.results;
    }

    sort(options) {
        if (!options) return this;
        // Simple sort logic can be added here if needed
        return this;
    }

    limit(n) {
        const num = parseInt(n);
        if (isNaN(num)) return this;

        if (this.promise || this.queryFilter) {
            // Delay limit until after promise/filter
            const originalThen = this.then.bind(this);
            this.then = (onFulfilled, onRejected) => {
                return originalThen(res => res.slice(0, num)).then(onFulfilled, onRejected);
            };
        } else if (this.results) {
            this.results = this.results.slice(0, num);
        }
        return this;
    }

    skip(n) {
        const num = parseInt(n);
        if (isNaN(num)) return this;

        if (this.promise || this.queryFilter) {
            const originalThen = this.then.bind(this);
            this.then = (onFulfilled, onRejected) => {
                return originalThen(res => res.slice(num)).then(onFulfilled, onRejected);
            };
        } else if (this.results) {
            this.results = this.results.slice(num);
        }
        return this;
    }

    select() { return this; }
    populate() { return this; }
    lean() { return this; }

    // Make it thenable so it can be awaited
    then(onFulfilled, onRejected) {
        const p = this._getResults();
        return p.then(onFulfilled, onRejected);
    }

    // Support for direct async iteration
    async *[Symbol.asyncIterator]() {
        const results = await this._getResults();
        for (const item of results) {
            yield item;
        }
    }
}
