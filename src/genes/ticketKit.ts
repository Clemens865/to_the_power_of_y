import adapterSource from './ticketButton.tsx?raw';
import adapterCss from './ticketButton.css?raw';

/** Only original adapter source ships in the kit; React Bits stays an official install. */
export const ticketKitFiles = () => ({
  'ticketButton.tsx': adapterSource.replace("'../vendor/react-bits/TearTicket/TearTicket'", "'./components/TearTicket/TearTicket'"),
  'ticketButton.css': adapterCss
});
