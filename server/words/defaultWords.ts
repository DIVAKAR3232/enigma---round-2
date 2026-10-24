/**
 * Built-in list of common, family-friendly five-letter English words.
 * Every word is checked against the full English dictionary in tests/words.test.ts.
 */
const RAW = `
about above actor acute admit adopt adult after again agent agree ahead alarm album alert alike
alive allow alone along alter amber among angle angry apple apply arena argue arise armor array
arrow aside asset audio avoid awake award aware badge baker basic beach beard beast begin being
below bench berry birth black blade blame blank blast blaze blend bless blind block bloom board
boast bonus boost booth brain brake brand brave bread break brick bride brief bring broad brook
brown brush build bunch burst buyer cabin cable camel candy cargo carry catch cause chain chair
chalk charm chart chase cheap check cheek cheer chess chest chief child chill choir civic claim
class clean clear clerk click cliff climb clock close cloud clown coach coast cocoa color comet
coral couch count court cover crack craft crane crash cream creek crisp crowd crown crust cubic
curve cycle daily dairy dance delta dense depth diary dodge donor doubt dozen draft drain drama
dream dress drift drink drive eager eagle early earth eight elbow elder elite empty enjoy enter
entry equal error essay event every exact exist extra fable faith false fancy feast fence ferry
fever fiber field fifty fight final flame flash fleet float flock flood floor flour fluid flute
focus force forge forum frame fresh front frost fruit funny gauge ghost giant given glass globe
glory glove grace grade grain grand grant grape graph grass great green greet grill group guard
guess guest guide habit happy harsh heart heavy hello hobby honey honor horse hotel house human
humor ideal image index inner input irony ivory jelly jewel joint judge juice jumbo kayak kneel
knife knock label laser later laugh layer learn lemon level light limit linen local logic loyal
lucky lunar lunch magic major maker mango maple march match mayor medal media melon mercy merit
metal meter minor mixer model money month moral motor mount mouse mouth movie music naval nerve
never night noble noise north novel nurse ocean offer olive onion opera orbit order organ other
otter outer owner paint panel paper party pasta patch peace peach pearl pedal penny phone photo
piano piece pilot pitch pixel pizza place plain plane plant plate plaza point polar porch pound
power press price pride prime print prize proof proud prove pulse punch pupil puppy quest quick
quiet quilt quite quote radar radio raise rally ranch range rapid raven reach react ready realm
rebel relax reply rider ridge right river roast robin robot rocky rough round route royal rugby
ruler rural salad sauce scale scarf scene scent scoop scope score scout sense serve seven shade
shake shape share shark sharp sheep sheet shelf shell shift shine shirt shock shore short shout
sight skill skirt slice slide slope smart smile smoke snack snake solar solid solve sound south
space spare spark speak speed spell spend spice spoon sport spray squad stack staff stage stair
stamp stand start state steam steel stick still stone storm story stove straw strip study style
sugar suite sunny super sweet swift swing sword table taste teach teeth thank theme thick thing
think third three throw thumb tiger timer toast today token topic torch total touch tower track
trade trail train treat trend trial tribe trick truck truly trunk trust truth tulip tutor twice
twist uncle under union unity upper urban usage usual valid value vapor vault video vigor visit
vital vivid vocal voice wagon waste watch water whale wheat wheel white whole width woman world
worry worth wrist write yacht young youth zebra
`;

export const DEFAULT_WORDS: readonly string[] = Object.freeze(
  Array.from(new Set(RAW.split(/\s+/).filter(Boolean).map((w) => w.toUpperCase()))),
);

export const DEFAULT_LIST_NAME = 'Built-in dictionary';
