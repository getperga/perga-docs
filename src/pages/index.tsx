import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import {Redirect} from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';

const INTRO_PATH = '/docs/intro';

export default function Home() {
  return (
    <>
      <Head>
        <title>Perga Documentation</title>
        <link rel="canonical" href="https://docs.getperga.me/docs/intro" />
        <meta httpEquiv="refresh" content={`0; url=${INTRO_PATH}`} />
      </Head>
      <BrowserOnly fallback={<Link to={INTRO_PATH}>Go to the Perga documentation</Link>}>
        {() => {
          return <Redirect to={INTRO_PATH} />;
        }}
      </BrowserOnly>
    </>
  );
}
