import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Daily Planner',
    Svg: require('@site/static/img/feature1.svg').default,
    description: (
      <>
        See and organize your tasks for the day.
      </>
    ),
  },
  {
    title: 'Monthly and Custom Agendas',
    Svg: require('@site/static/img/feature2.svg').default,
    description: (
      <>
        Plan your month and group long-term goals in custom agendas.
      </>
    ),
  },
  {
    title: 'Responsive design and Dark Theme',
    Svg: require('@site/static/img/feature3.svg').default,
    description: (
      <>
        Use your planner on desktop, tablet, or mobile.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
