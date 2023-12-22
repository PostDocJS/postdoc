import { performance } from 'node:perf_hooks';

import Logger from '../logger.js';

const Months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

function preserveTwoDigits(value) {
  return value.toString(10) + (value < 10 ? '0' : '');
}

/*
 * Creates an opinionated timestamp from the current Date.
 *
 * @ignore
 * @returns {string} Value with "26 Feb 16:19:34" format.
 */
function timestamp() {
  const current = new Date();

  const day = current.getDate();

  const month = Months[current.getMonth()];

  const time = [
    preserveTwoDigits(current.getHours()),
    preserveTwoDigits(current.getMinutes()),
    preserveTwoDigits(current.getSeconds())
  ].join(':');

  return `${day} ${month} ${time}`;
}

export default async function runAndMeasureAction(callback) {
  const start = performance.now();

  await callback();

  const end = performance.now();

  Logger.log((typography) => {
    const message = `Date: ${typography.bold(
      timestamp()
    )} - Spent time: ~${typography.bold(Math.round(end - start))}ms.`;

    return typography.grey(message);
  });
}
