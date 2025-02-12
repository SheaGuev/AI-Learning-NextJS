import Image from 'next/image'
import * as Logo from './ll.png';

 
export default function ll() {
  return (
    <Image
      src={Logo}
      width={500}
      height={500}
      alt="Picture of the author"
    />
  )
}