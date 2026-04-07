// import LoginPage from "../auth/LoginPage.jsx";

// export default function OperatorsPage() {
//   return (
//     <div
//       style={{
//         display: "flex",
//         gap: "20px",
//         padding: "20px",
//         minHeight: "100vh",
//         boxSizing: "border-box",
//       }}
//     >
//       <div style={{ flex: 1, minWidth: 320 }}>
//         <LoginPage defaultRole="admin" />
//       </div>
//       <div style={{ flex: 1, minWidth: 320 }}>
//         <LoginPage defaultRole="minister" />
//       </div>
//       <div style={{ flex: 1, minWidth: 320 }}>
//         <LoginPage defaultRole="deo" />
//       </div>
//     </div>
//   );
// }


import LoginPage from "../auth/LoginPage.jsx";

export default function OperatorsPage() {
  return (
    /* Outer Container: Screen ke center mein laane ke liye */
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",       /* Vertically center karega */
        justifyContent: "center",   /* Horizontally center karega */
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* Inner Container: Teeno cards ki height barabar (stretch) karne ke liye */}
      <div
        style={{
          display: "flex",
          gap: "24px",              /* Cards ke beech ka gap */
          alignItems: "stretch",    /* TEENO DIVS KI HEIGHT SAME KAREGA */
          width: "100%",
          maxWidth: "1200px",       /* Maximum width set karega taaki zyada na faile */
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <LoginPage defaultRole="admin" />
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <LoginPage defaultRole="minister" />
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <LoginPage defaultRole="deo" />
        </div>
      </div>
    </div>
  );
}