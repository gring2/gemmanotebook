// Simple test for multi-turn logic without imports
console.log('🧪 Testing Multi-Turn Report Generation Logic\n');

// Test Korean detection
function containsKorean(text) {
  const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;
  return koreanRegex.test(text);
}

// Test shouldUseMultiTurn logic  
function shouldUseMultiTurn(instruction, referenceText) {
  const isKorean = containsKorean(instruction);
  const isReportRequest = instruction.includes('리포트') || 
                         instruction.includes('보고서') || 
                         instruction.includes('초안') ||
                         instruction.includes('작성');
  const hasLargeReference = referenceText.length > 800;
  const hasReference = referenceText.trim().length > 0;

  const shouldUse = isKorean && isReportRequest && hasLargeReference && hasReference;
  
  console.log('Multi-turn decision:', {
    isKorean,
    isReportRequest, 
    hasLargeReference,
    hasReference,
    shouldUse
  });

  return shouldUse;
}

// Test data - your FDA eye drops article
const testReferenceText = `FDA approves breakthrough eye drops that fix near vision without glasses
By Bronwyn Thompson
August 06, 2025

The first aceclidine-based eye drop to improve near vision in adults with presbyopia, which affects more than 100 million adults in the US alone, has been approved by the Food and Drug Administration (FDA) and will be available within three months.

Known as VIZZ, from pharmaceutical company LENZ, the drops are an aceclidine ophthalmic solution that effectively treats presbyopia in adults. The once-daily drops offer relief from blurry near. vision for up to 10 hours.

"The FDA approval of VIZZ is a defining moment for LENZ and represents a transformative improvement in the available treatment options for the 128 million adults living with blurry near vision in the United States," said Eef Schimmelpennink, President and Chief Executive Officer of LENZ Therapeutics.

VIZZ works by gently shrinking the pupil of the eye, using aceclidine. This creates a "pinhole effect" – like narrowing a camera lens — which helps bring nearby objects into sharper focus. Unlike older eye drops, this one does not significantly affect the eye's focusing muscles, so it doesn't blur your distance vision or cause that "zoomed-in" effect (aka a myopic shift).

The FDA approval comes on the back of three randomized, double-masked, controlled Phase II studies featuring hundreds of participants. VIZZ was well-tolerated with no serious adverse events observed in the 30,000-plus treatment days across all three trials.`;

// Test scenarios
console.log('=== Test Scenarios ===\n');

// Test 1: Original problem case
const instruction1 = '참고자료를 활용해서 리포트의 초안을 만들어줘';
console.log('Test 1: Korean report request with reference materials');
console.log('Instruction:', instruction1);
console.log('Reference length:', testReferenceText.length);
const result1 = shouldUseMultiTurn(instruction1, testReferenceText);
console.log('Should use multi-turn:', result1 ? '✅ YES' : '❌ NO');
console.log();

// Test 2: English request (should not use multi-turn)
const instruction2 = 'Write a report using reference materials';
console.log('Test 2: English report request');
console.log('Instruction:', instruction2);
const result2 = shouldUseMultiTurn(instruction2, testReferenceText);
console.log('Should use multi-turn:', result2 ? '✅ YES' : '❌ NO');
console.log();

// Test 3: Korean but no reference (should not use multi-turn)
const instruction3 = '리포트 초안을 작성해줘';
console.log('Test 3: Korean report request without reference materials');
console.log('Instruction:', instruction3);
const result3 = shouldUseMultiTurn(instruction3, '');
console.log('Should use multi-turn:', result3 ? '✅ YES' : '❌ NO');
console.log();

// Test 4: Korean with small reference (should not use multi-turn)
const instruction4 = '리포트를 작성해줘';
const smallRef = 'Small reference text';
console.log('Test 4: Korean report request with small reference');
console.log('Instruction:', instruction4);
console.log('Reference length:', smallRef.length);
const result4 = shouldUseMultiTurn(instruction4, smallRef);
console.log('Should use multi-turn:', result4 ? '✅ YES' : '❌ NO');
console.log();

// Summary
console.log('=== Test Summary ===');
console.log('✅ Test 1 (Korean + large reference + report request): Should use multi-turn =', result1);
console.log('❌ Test 2 (English request): Should NOT use multi-turn =', !result2);
console.log('❌ Test 3 (Korean but no reference): Should NOT use multi-turn =', !result3);  
console.log('❌ Test 4 (Korean but small reference): Should NOT use multi-turn =', !result4);

const allTestsPassed = result1 && !result2 && !result3 && !result4;
console.log('\n🎯 Overall Result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

if (allTestsPassed) {
  console.log('\n🎉 SUCCESS: Multi-turn detection logic works correctly!');
  console.log('The system will:');
  console.log('- Use multi-turn for Korean report requests with large reference materials (your use case)');
  console.log('- Fall back to single-turn for other cases');
} else {
  console.log('\n❌ FAILURE: Multi-turn detection logic needs adjustment');
}