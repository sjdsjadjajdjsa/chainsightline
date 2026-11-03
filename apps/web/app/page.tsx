import { Intro } from "../components/Intro";
import { SightlineWorkspace } from "../components/SightlineWorkspace";
import { sampleInvestigation } from "../../../packages/core/src/sample";
export default function Home() { return <><Intro /><SightlineWorkspace initial={sampleInvestigation} /></>; }
