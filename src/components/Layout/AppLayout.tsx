import { Container } from '@chakra-ui/react';

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <Container
    display="flex"
    minW={['414px', '768px', '768px', '1200px']}
    minH="100vh"
    m="auto auto 0"
    px={['21px', '22px']}
  >
    {children}
  </Container>
);

export default AppLayout;
