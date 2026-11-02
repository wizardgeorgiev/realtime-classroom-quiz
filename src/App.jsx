import React, { useState } from "react";
import TeacherScreen from "./components/TeacherScreen";
import StudentScreen from "./components/StudentScreen";
import { Button, Card, Space } from "antd";

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const roomFromUrl = queryParams.get("room");

  const [role, setRole] = useState(roomFromUrl ? "student" : null);
  const [roomId, setRoomId] = useState(roomFromUrl || "ROOM101");

  if (role === "teacher") {
    return <TeacherScreen roomId={roomId} />;
  }

  if (role === "student") {
    return <StudentScreen roomId={roomId} />;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f5f5f5" }}>
      <Card title="Classroom Interactive Quiz Setup" style={{ width: 400, textAlign: "center" }}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Button type="primary" block size="large" onClick={() => setRole("teacher")}>
            Open Big Screen (Teacher)
          </Button>
          <Button block size="large" onClick={() => setRole("student")}>
            Join as Student
          </Button>
        </Space>
      </Card>
    </div>
  );
}
