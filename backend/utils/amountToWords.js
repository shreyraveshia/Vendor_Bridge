/**
 * amountToWords.js
 * Converts a number to Indian-English words (Crore, Lakh, Thousand)
 * e.g. 118000 → "One Lakh Eighteen Thousand Rupees Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/**
 * Convert a number < 1000 to words
 */
function belowThousand(n) {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }
  // 100–999
  const hundred = ones[Math.floor(n / 100)] + ' Hundred';
  const remainder = n % 100;
  return remainder === 0 ? hundred : hundred + ' ' + belowThousand(remainder);
}

/**
 * Main converter — handles Indian numbering system
 * @param {number} amount – a non-negative number (integer or decimal)
 * @returns {string} e.g. "One Lakh Eighteen Thousand Rupees Only"
 */
function amountToWords(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Zero Rupees Only';

  const rounded = Math.round(Number(amount));
  if (rounded === 0) return 'Zero Rupees Only';

  let n = Math.abs(rounded);
  const parts = [];

  // Crore (10,000,000)
  if (n >= 10000000) {
    parts.push(belowThousand(Math.floor(n / 10000000)) + ' Crore');
    n %= 10000000;
  }

  // Lakh (100,000)
  if (n >= 100000) {
    parts.push(belowThousand(Math.floor(n / 100000)) + ' Lakh');
    n %= 100000;
  }

  // Thousand
  if (n >= 1000) {
    parts.push(belowThousand(Math.floor(n / 1000)) + ' Thousand');
    n %= 1000;
  }

  // Remainder < 1000
  if (n > 0) {
    parts.push(belowThousand(n));
  }

  const words = parts.join(' ').trim();
  return (rounded < 0 ? 'Minus ' : '') + words + ' Rupees Only';
}

module.exports = amountToWords;
