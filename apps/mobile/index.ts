// 자격증봄 네이티브 앱의 알림 표시 정책과 React Native 진입점을 등록한다.
import { registerRootComponent } from "expo";
import App from "./App";
import { configureNotificationPresentation } from "./src/notifications";

configureNotificationPresentation();
registerRootComponent(App);
