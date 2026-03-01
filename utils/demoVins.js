/**
 * Utility for sequential VIN detection in Demo Mode.
 * Tracks the index globally for the session to ensure rotation.
 */

const MOCK_VINS = [
  '1HGBH41JXMN109186', // Honda Accord
  '1FTFW1ET5EFA12345', // Ford F-150
  '6YJSA1E26HF000001', // Tesla Model S
  'WBA3B3G5XFK000002', // BMW 3 Series
  'WAUZZZ8T0GA000003', // Audi A5
];

let currentIndex = 0;

/**
 * Returns the next VIN in the list, rotating back to the start.
 */
export const getNextVIN = () => {
  const vin = MOCK_VINS[currentIndex];
  currentIndex = (currentIndex + 1) % MOCK_VINS.length;
  console.log(`[DemoVIN] Rotating to next VIN: ${vin} (Index: ${currentIndex})`);
  return vin;
};

/**
 * Resets the rotation index.
 */
export const resetVINRotation = () => {
  currentIndex = 0;
};
