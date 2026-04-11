# Here are your Instructions
Un componente específico:


cd frontend
npx react-scripts test --watchAll=false --testPathPattern="Pagination"
Todos los tests de una vez:


cd frontend
npx react-scripts test --watchAll=false
Modo watch (re-ejecuta al guardar):


cd frontend
npx react-scripts test
Un archivo exacto:


cd frontend
npx react-scripts test --watchAll=false --testPathPattern="POS/__tests__/POS"