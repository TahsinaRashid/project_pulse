const { getCollection, ObjectId, normalizeObjectId } = require('./db');

function parseSelect(selectValue) {
  if (!selectValue) return {};
  if (typeof selectValue === 'string') {
    const projection = {};
    for (const part of selectValue.split(/\s+/).filter(Boolean)) {
      if (!part) continue;
      if (part.startsWith('-')) {
        projection[part.slice(1)] = 0;
      } else {
        projection[part] = 1;
      }
    }
    return projection;
  }
  return selectValue;
}

function normalizeFilterValue(value) {
  if (value instanceof ObjectId) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeFilterValue(item));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).reduce((result, [key, itemValue]) => {
      result[key] = normalizeFilterValue(itemValue);
      return result;
    }, {});
    return entries;
  }
  if (typeof value === 'string') {
    if (value.length === 24 && /^[a-fA-F0-9]{24}$/.test(value)) {
      return new ObjectId(value);
    }
    return value;
  }
  return value;
}

function normalizeFilter(filter = {}) {
  if (!filter || typeof filter !== 'object') return filter;
  return Object.entries(filter).reduce((result, [key, value]) => {
    if (key === '_id' || /Id$/.test(key)) {
      result[key] = normalizeFilterValue(value);
      return result;
    }
    result[key] = normalizeFilterValue(value);
    return result;
  }, {});
}

function buildQuery(collectionName, filter = {}, mode = 'many') {
  let queryFilter = normalizeFilter(filter);
  let sortDoc = null;
  let limitValue = null;
  let projection = {};
  let shouldLean = false;

  const execute = async () => {
    const collection = await getCollection(collectionName);
    let cursor = collection.find(queryFilter);

    if (sortDoc) {
      cursor = cursor.sort(sortDoc);
    }
    if (limitValue) {
      cursor = cursor.limit(limitValue);
    }
    if (Object.keys(projection).length) {
      cursor = cursor.project(projection);
    }

    const result = mode === 'one' ? await cursor.next() : await cursor.toArray();
    return result;
  };

  const query = {
    sort(nextSort) {
      sortDoc = nextSort || {};
      return this;
    },
    limit(value) {
      limitValue = value;
      return this;
    },
    select(fields) {
      projection = parseSelect(fields);
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      shouldLean = true;
      return execute();
    },
    exec() {
      return execute();
    },
    then(resolve, reject) {
      return execute().then(resolve, reject);
    },
  };

  if (mode === 'one' && !shouldLean) {
    query.lean = () => execute();
  }

  return query;
}

function makeModel(collectionName) {
  return {
    find(filter = {}) {
      return buildQuery(collectionName, filter, 'many');
    },
    findOne(filter = {}) {
      return buildQuery(collectionName, filter, 'one');
    },
    findById(id) {
      return buildQuery(collectionName, { _id: id }, 'one');
    },
    async create(data) {
      const collection = await getCollection(collectionName);
      if (!data || typeof data !== 'object') {
        throw new Error('Document payload must be an object');
      }
      const payload = normalizeFilter(data);
      const result = await collection.insertOne(payload);
      return { ...payload, _id: result.insertedId };
    },
    async findByIdAndUpdate(id, update, options = {}) {
      const collection = await getCollection(collectionName);
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: options.new === false ? 'before' : 'after' }
      );
      return result && Object.prototype.hasOwnProperty.call(result, 'value')
        ? result.value
        : result;
    },
    async deleteMany(filter = {}) {
      const collection = await getCollection(collectionName);
      return collection.deleteMany(normalizeFilter(filter));
    },
    async countDocuments(filter = {}) {
      const collection = await getCollection(collectionName);
      return collection.countDocuments(normalizeFilter(filter));
    },
    async aggregate(pipeline = []) {
      const collection = await getCollection(collectionName);
      return collection.aggregate(pipeline).toArray();
    },
    async updateOne(filter, update) {
      const collection = await getCollection(collectionName);
      return collection.updateOne(normalizeFilter(filter), update);
    },
    async updateMany(filter, update) {
      const collection = await getCollection(collectionName);
      return collection.updateMany(normalizeFilter(filter), update);
    },
  };
}

module.exports = { makeModel };
