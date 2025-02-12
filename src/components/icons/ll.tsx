import Image from 'next/image'
import * as Logo from './ll.png';

 
export default function ll() {
  return (
    <Image
      src={Logo}
      width={50}
      height={50}
      alt="Picture of the author"
    />
  )
}