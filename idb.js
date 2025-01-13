/**
 * DB Helper Class
 * Provides simplified access to IndexedDB
 */
class IndexedDBWrapper {
  /**
   * Creates a new instance of the DB wrapper.
   * @param {string} dbName - The name of the database.
   * @param {number} version - The version of the database.
   * @param {function} upgradeCallback - The function to handle upgrades.
   */
  constructor(dbName, version, upgradeCallback) {
    this.dbName = dbName;
    this.version = version;
    this.upgradeCallback = upgradeCallback;
    this.db = null;
  }

  /**
   * Opens the database.
   * @returns {Promise} A promise that resolves to the database instance.
   */
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (this.upgradeCallback) {
          this.upgradeCallback(db);
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(`Failed to open DB: ${event.target.errorCode}`);
      };
    });
  }

  /**
 * Adds or Updates a record in an object store.
 * Requires `date`, `sum`, and `category` fields.
 * Automatically increments `id` if not provided.
 * @param {string} storeName - The name of the object store.
 * @param {object} data - The data to be added/updated.
 * @returns {Promise} A promise that resolves when the operation completes.
 */
addOrUpdate(storeName, data) {
  return new Promise((resolve, reject) => {
    // Validate required fields
    if (!data.date) {
      reject('The `date` field is required.');
      return;
    }

    if (typeof data.sum !== 'number' || data.sum <= 0) {
      reject('The `sum` field is required and must be a positive number.');
      return;
    }

    if (!data.category || typeof data.category !== 'string') {
      reject('The `category` field is required and must be a string.');
      return;
    }

    const transaction = this.db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Omit `id` to allow auto-increment
    if ('id' in data) delete data.id;

    const request = store.put(data);

    request.onsuccess = () => {
      resolve('Data added/updated successfully');
    };

    request.onerror = (event) => {
      reject(`Failed to add/update data: ${event.target.errorCode}`);
    };
  });
}

  /**
   * Retrieves all records from an object store.
   * @param {string} storeName - The name of the object store.
   * @returns {Promise} A promise that resolves to an array of records.
   */
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(`Failed to fetch records: ${event.target.errorCode}`);
      };
    });
  }

  /**
   * Deletes a record by key.
   * @param {string} storeName - The name of the object store.
   * @param {any} key - The key of the record to delete.
   * @returns {Promise} A promise that resolves when the operation completes.
   */
  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve('Record deleted successfully');
      };

      request.onerror = (event) => {
        reject(`Failed to delete record: ${event.target.errorCode}`);
      };
    });
  }

/**
   * Gets a detailed report for a specific year.
   * @param {string} storeName - The name of the object store.
   * @param {number} year - The year for the report.
   * @returns {Promise} A promise that resolves to the detailed report for the entire year.
   */
  getYearlyReport(storeName, year) {
    return this.getAll(storeName).then((records) => {
      if (records.length === 0) {
        return `No records found for ${year}.`;
      }

      // Filter records by year
      const yearlyRecords = records.filter((record) => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year;
      });

      // Group records by category
      const report = {};
      yearlyRecords.forEach((record) => {
        if (!report[record.category]) {
          report[record.category] = {
            totalSum: 0,
            items: [],
          };
        }
        report[record.category].totalSum += record.sum;
        report[record.category].items.push(record);
      });

      return report;
    });
  }


  /**
 * Gets a detailed report for a specific month and year.
 * @param {string} storeName - The name of the object store.
 * @param {number} month - The month (1-12) for the report.
 * @param {number} year - The year for the report.
 * @returns {Promise} A promise that resolves to the detailed report.
 */
getMonthlyReport(storeName, month, year) {
  return this.getAll(storeName).then((records) => {
    if (records.length === 0) {
      return `No records found for ${month}/${year}.`;
    }

    // Filter records by the specified month and year
    const monthlyRecords = records.filter((record) => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
    });

    if (monthlyRecords.length === 0) {
      return `No records found for ${month}/${year}.`;
    }

    // Group records by category
    const report = {};
    monthlyRecords.forEach((record) => {
      if (!report[record.category]) {
        report[record.category] = {
          totalSum: 0,
          items: [],
        };
      }
      report[record.category].totalSum += record.sum;
      report[record.category].items.push(record);
    });

    return report;
  });
}
}

export default IndexedDBWrapper;
