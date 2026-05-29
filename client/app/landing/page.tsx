/**
 * tmailCC - Legacy Landing Route Page
 * 
 * Thực hiện redirect vĩnh viễn từ /landing sang route gốc /.
 */
import { redirect } from 'next/navigation';

export default function LandingPage() {
  redirect('/');
}
