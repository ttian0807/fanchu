import React from "react";
import { css } from "./styles/theme.js";
import { TrackerProvider, useTracker } from "./context/TrackerContext.jsx";
import Nav from "./components/Nav.jsx";
import DateToolbar from "./components/DateToolbar.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import RoutinesPage from "./pages/RoutinesPage.jsx";
import ProjectTypesPage from "./pages/ProjectTypesPage.jsx";
import Pipeline from "./pages/PipelinePage.jsx";

function AppContent() {
  const {
    data, up, loading, view, setView,
    expanded, setExpanded,
    systemDate, selectedDate,
    activeProjectTypes, onExport,
  } = useTracker();

  const isTypeView = view.startsWith("type:");
  const isRoutineView = view === "routines";
  const currentTypeId = isTypeView ? view.slice(5) : null;

  if (loading) return <div style={css.center}><p style={css.dim}>加载中...</p></div>;

  return (
    <div style={css.root}>
      <div style={css.ambient}>
        <div style={css.glowOne}/>
        <div style={css.glowTwo}/>
        <div style={css.glowThree}/>
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <Nav/>
      <div style={css.body}>
        {view !== "types" && !isRoutineView && <DateToolbar/>}
        {view === "today"
          ? <TodayPage
              data={data}
              up={up}
              today={selectedDate}
              systemDate={systemDate}
              setView={setView}
              setExpanded={setExpanded}
            />
          : view === "types"
            ? <ProjectTypesPage data={data} up={up} setView={setView}/>
            : view === "routines"
              ? <RoutinesPage data={data} up={up} setView={setView}/>
            : <Pipeline typeId={currentTypeId} data={data} up={up} today={selectedDate} systemDate={systemDate} expanded={expanded} setExpanded={setExpanded}/>
        }
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TrackerProvider>
      <AppContent/>
    </TrackerProvider>
  );
}
