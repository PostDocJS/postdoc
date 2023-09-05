import Stream from '@halo-lab/stream';

/**
 * Creates a broadcasting stream that allows multiple subscribers and
 * can populate changes with or without them.
 *
 * @template I
 * @returns {[Stream.Self<I>, Stream.Sink<I>]}
 */
export const createBroadcastingStream = () => {
  const listeners = new Set();

  return [
    Stream.from((push) => {
      listeners.add(push);

      return () => {
        listeners.delete(push);
      };
    }),
    (value) => listeners.forEach((push) => push(value))
  ];
};
