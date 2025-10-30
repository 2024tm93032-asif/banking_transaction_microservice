const db = require('./connection');

/**
 * Initialize database by running migrations
 */
const migrate = async () => {
  try {
    await db.migrate();
    console.log('Database migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };