/**
 * Utility for sequential VIN detection in Demo Mode.
 * Tracks the index globally for the session to ensure rotation.
 */

const MOCK_VINS = [
  '1HGBH41JXMN', // Honda Accord prefix
  '1FTFW1ET5EF', // Ford F-150 prefix
  '6YJSA1E26HF', // Tesla Model S prefix
  'WBA3B3G5XFK', // BMW 3 Series prefix
  'WAUZZZ8T0GA', // Audi A5 prefix
];

let currentIndex = 0;

/**
 * Generates a random alphanumeric string of a given length.
 */
const generateRandomSuffix = (length) => {
  const chars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Returns the next VIN in the list with a randomized suffix to avoid backend collisions.
 */
export const getNextVIN = () => {
  const prefix = MOCK_VINS[currentIndex];
  currentIndex = (currentIndex + 1) % MOCK_VINS.length;
  
  // Create a 17-character VIN by appending a random 10-character suffix
  // Note: Standard VINs are 17 chars. Prefixes here are vary in length.
  // We'll ensure the final length is exactly 17.
  const suffixLength = 17 - prefix.length;
  const vin = `${prefix}${generateRandomSuffix(suffixLength)}`;
  
  console.log(`[DemoVIN] Generated unique VIN: ${vin} (Base Index: ${currentIndex})`);
  return vin;
};

/**
 * Resets the rotation index.
 */
export const resetVINRotation = () => {
  currentIndex = 0;
};
