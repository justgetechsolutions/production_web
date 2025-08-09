require('dotenv').config();

console.log('🔍 Testing Environment Variables...\n');

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Found' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');
console.log('PORT:', process.env.PORT || '5000 (default)');

if (process.env.GEMINI_API_KEY) {
  console.log('\n🔑 API Key format check:');
  const key = process.env.GEMINI_API_KEY;
  if (key.startsWith('AIza') && key.length > 30) {
    console.log('✅ API key format looks correct');
    console.log('   Length:', key.length, 'characters');
    console.log('   Starts with:', key.substring(0, 10) + '...');
  } else {
    console.log('❌ API key format looks incorrect');
    console.log('   Should start with "AIza" and be longer than 30 characters');
    console.log('   Current key:', key);
  }
} else {
  console.log('\n❌ GEMINI_API_KEY is missing from .env file');
}

console.log('\n📝 Make sure your .env file is in the server folder and contains:');
console.log('GEMINI_API_KEY=your_actual_api_key_here');
console.log('\n💡 To run this test: node test_env.js'); 